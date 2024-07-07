# Scheduling with a Grin

[![Coverage Status](https://coveralls.io/repos/github/TotalTechGeek/pg-swag/badge.svg?branch=main)](https://coveralls.io/github/TotalTechGeek/pg-swag?branch=main)

PG Swag is a distributed scheduling library intended to simplify the process of scheduling tasks across one or more nodes, leveraging the Postgres database as a shared state.

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
    host: 'localhost',
    user: 'postgres',
    password: 'password',
})

swag.on('email', async job => {
    console.log('Sending email to', job.data.email, 'with message', job.data.body)
})

// Schedules an email to be sent to Bob every day from July 1st, 2024
swag.schedule('email', { 
    email: 'bob@example.com',
    body: 'Hello, Bob!'
}, 'R/2024-07-01/P1D')
```
