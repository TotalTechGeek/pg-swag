# Scheduling with a Grin

[![Coverage Status](https://coveralls.io/repos/github/TotalTechGeek/pg-swag/badge.svg?branch=main)](https://coveralls.io/github/TotalTechGeek/pg-swag?branch=main)

<img src="https://i.imgur.com/Xio7kHx.png" alt="An elephant wearing sunglasses" width="250px" />

Have you ever needed to run a task (emails, reports, cleanup) at a specific time, or on a recurring schedule? Have you ever had multiple processes you needed to distribute the workload between?

PG Swag is a distributed scheduling library intended to simplify the process of scheduling tasks across one or more nodes, leveraging the Postgres database as a shared state.

During our local testing, we found that this setup easily scaled to 30K Recurring Schedules/s on a single node; however, we believe it to be unlikely that the scheduler will be your bottleneck.

### Information

In this package, there are no "leader nodes", each node is responsible for grabbing and executing tasks. It also does not require a separate service to manage the scheduling, as the database is used as the source of truth. Additionally, it is designed to be resilient to node failures, and can be run in a distributed environment. Lastly, it is designed to be efficient with fetching tasks -- it precomputes when the task should be run, and only fetches tasks that are ready to be run.

The querying leverages skip locks to ensure that only one node is running a task at a time; however, I believe it would be trivial to remove it and apply this system to other databases.

### How to use

To use this package, you will need to install it with your preferred package manager; we enjoy bun:

```bash
bun add pg-swag
```

Then, you can use it in your code like so:

```javascript
import { Swag } from 'pg-swag';

const swag = new Swag({
    dialect: 'postgres',
    config: {
        host: 'localhost',
        user: 'postgres',
        password: 'password',
    }
})

await swag.on('email', async job => {
    console.log('Sending email to', job.data.email, 'with message', job.data.body)
})

// Schedules an email to be sent to Bob every day from July 1st, 2024
await swag.schedule('email', { 
    email: 'bob@example.com',
    body: 'Hello, Bob!'
}, 'R/2024-07-01/P1D')
```

Alternatively, you can pass in a query method like so:

```javascript
import { Swag } from 'pg-swag';

const swag = new Swag({
    dialect: 'postgres',
    query: db.query 
})
```

### Supported Scheduling

We support a variety of scheduling options, including:

- [ISO 8601 Repeating Intervals](https://en.wikipedia.org/wiki/ISO_8601#Repeating_intervals)
- [ISO 8601 Dates and Times](https://en.wikipedia.org/wiki/ISO_8601#Combined_date_and_time_representations)
- [Cron Expressions](https://en.wikipedia.org/wiki/Cron)

Some examples are outlined below.

#### ISO 8601 Repeating Intervals

These are defined by the `R` prefix, followed by the start date, and then the interval. For example, `R/2024-07-01/P1D` would start on July 1st, 2024, and repeat every day.

`P` represents the period, and can be followed by `Y` for years, `M` for months, `W` for weeks, and `D` for days. Using `T` will allow you to specify hours, minutes, and seconds.

Examples:

- `R/2024-07-01/P1D` - Every day starting July 1st, 2024
- `R/2024-07-01T12:00:00/PT1H` - Every hour starting July 1st, 2024 at 12:00:00
- `R/2024-07-01T12:00:00/PT1H30M` - Every hour and a half starting July 1st, 2024 at 12:00:00
- `R/PT1H` - Every hour starting now

If you specify a start date, you can also specify the number of recurrences you'd like (`R#`):

- `R5/2024-07-01/P1D` - Every day starting July 1st, 2024, up to 5 times
- `R5/2024-07-01T12:00:00/PT1H` - Every hour starting July 1st, 2024 at 12:00:00, up to 5 times

Additionally, we support one non-standard format for this interval, `R/<start>/<end>/<interval>`:

- `R/2024-07-01/2024-07-05/P1D` - Every day from July 1st, 2024 to July 5th, 2024
- `R/2024-07-01T12:00:00/2024-07-01T13:00:00/PT1M` - Every minute from July 1st, 2024 at 12:00:00 to July 1st, 2024 at 13:00:00

#### ISO 8601 Dates and Times

- `2024-07-01T12:00:00` - July 1st, 2024 at 12:00:00
- `2020-01-01` - January 1st, 2020
- `new Date('2020-01-01')` - JavaScript Dates are also supported

These will not repeat, and will only run once.

#### Duration Objects

You can also pass in a duration object, which is an object with the following fields:

Field | Description
-- | --
years | # of Years
months | # of Months
weeks | # of Weeks
days | # of Days
hours | # of Hours
minutes | # of Minutes
seconds | # of Seconds
recurrences | # of Recurrences
startDate | The date to start the schedule
endDate | The date to end the schedule

Upon calling `schedule`, the duration object will be converted into an ISO8601 Repeating Interval.

- `{ days: 1 }` - Every day starting now
- `{ days: 1, recurrences: 5 }` - Every day starting now, up to 5 times
- `{ hours: 1, startDate: '2024-07-01T12:00:00' }` - Every hour starting July 1st, 2024 at 12:00:00

#### Cron Expressions

We use the [cron-parser](https://www.npmjs.com/package/cron-parser) package to parse cron expressions. These are defined by the standard cron syntax (and we specifically recommend the 5 field syntax). For example, `0 0 * * *` would run every day at midnight.

#### Future Additions

We are planning on adding support for more scheduling options, for example: "every sunrise" or "every 3 sunrises". If someone needs this, file an issue and we will prioritize it.

### Technical Details

In this package, jobs & schedules are one and the same; there is no distinction between the two, thus allowing us to leverage a single table design.

The table structure is as follows

Field | Description
-- | --
queue | The type of task you wish to perform
id | An ID to represent the task
run_at | Generated field to determine when the task should be run
data | The data to be passed to the task
expression | The scheduling expression
locked_until | The time the task is locked until
locked_by | The node that has locked the task
attempts | The number of attempts that have been made to run the task

The main index for fetching tasks is on `queue` and `greatest(run_at, locked_until)` to make it efficient to fetch tasks that are ready to be run.

We also have a unique index on `queue` and `id` to ensure that tasks are not duplicated, and make it efficient to update & delete tasks.

**Note:** In the future, it might be wise for us to automatically handle partitioning the table as different queues are introduced and such. It does not at the moment, however, we do not anticipate this being a problem for most users. It should be reasonably performant for hundreds of thousands of tasks (your bottleneck will likely not be the scheduler).

### Class Configuration

When creating a new instance of the scheduler, there are two main options to pass in:

Option | Description | Default
-- | -- | --
Connection Configuration | [The configuration for the Postgres connection](https://github.com/vitaly-t/pg-promise/wiki/Connection-Syntax) | {}
Table Configuration | { schema?: null \| string, table?: string } | { table: 'jobs', schema: null }

By default, it will create a table called `jobs` in the public schema. If you want to use a different schema or table name, you can pass it in as an option.

### Schedule Configuration

When setting up a reader for a queue, you can pass in a configuration object to customize the behavior of the reader. The following options are available:

Option | Description | Type | Default
-- | -- | -- | --
batchSize | The number of tasks to fetch at a time | number | 100
concurrentJobs | The number of tasks to run concurrently | number | 10
pollingPeriod | The amount of time to wait between polling for tasks | number (milliseconds) or string ('15 seconds') | 15000
flushPeriod | The amount of time before writing finished tasks to the database |  number (milliseconds) or string ('15 seconds')  | 1000
lockPeriod | The amount of time to lock a task for | number (milliseconds) or string ('15 seconds')  | '1 minutes'
skipPast | Whether to schedule tasks in the past, or to continue the schedule after current time. See below. | boolean | true
maxHeartbeats | The number of heartbeats before releasing a lock on tasks not actively being worked on in a batch | number | Infinity

#### Skip Past

By default, the scheduler will not schedule tasks in the past. For example, if you have a 5 minute periodicity, and your service was down for 6h, when the scheduler starts back up, it will schedule 5m from the current time, not 6h ago, this is to avoid running ~72 tasks.

If you want to run all the tasks that were missed, you can set `skipPast` to `false`. This will schedule all the tasks that were missed, and then continue the schedule as normal.

### Error Handling

You might notice that the module does not have an option like `maxAttempts`. This is because we believe that the error handling should be done in the task (or its error handler) itself. If you want to retry a task, you can simply throw an error, and the task will be retried.

You can also return an object from a job to modify certain behaviors. For example, you can return `{ expression: 'cancel' }` to cancel the task.

The handler will receive the number of attempts that have been made, and you can use this to determine if you should retry the task.

```javascript
swag.on('email', async job => {
    if (job.attempts > 3) return { expression: 'cancel' }
    // ...
})
```

If you wanted, you could shift this behavior into the error handler for a queue,

```javascript
swag.on('email', async job => {
    // ...
}).onError(async (err, job) => {
    if (job.attempts > 3) return { expression: 'cancel' }
})
```

Or apply it globally, for all queues,

```javascript
swag.onError(async (err, job) => {
    if (job.attempts > 3) return { expression: 'cancel' }
})
```

We've provided a utility function to make this simpler:

```javascript
import { cancelAfter, Swag } from 'pg-swag'
// ... 
Swag.onError(cancelAfter(3))
```

However, we STRONGLY advise that you go beyond using `cancelAfter` and write some more sophisticated error handling logic, so that you can communicate to the user (or your developers) what went wrong.

Similarly, it is possible to use `{ lockedUntil: Date }` to lock the task until a specific time. This can be useful if you want to programmatically delay a task upon failure.

```javascript
Swag.onError(async (err, job) => {
    // Lock the task by 1 extra minute for each attempt
    return { lockedUntil: new Date(Date.now() + 1000 * 60 * job.attempts) }
})
```
