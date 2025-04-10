import { BaseMessage } from "../bus/mod.js";
export class JobStarted extends BaseMessage {
  job;
  constructor(job) {
    super("job:started");
    this.job = job;
  }
}
export class JobCompleted extends BaseMessage {
  job;
  result;
  constructor(job, result) {
    super("job:completed");
    this.job = job;
    this.result = result;
  }
}
export class JobSkipped extends BaseMessage {
  job;
  constructor(job) {
    super("job:skipped");
    this.job = job;
  }
}
export class JobFailed extends BaseMessage {
  job;
  error;
  constructor(job, error) {
    super("job:failed");
    this.job = job;
    this.error = error;
  }
}
export class JobCancelled extends BaseMessage {
  job;
  constructor(job) {
    super("job:cancelled");
    this.job = job;
  }
}
export class MissingJobDependencies extends BaseMessage {
  jobs;
  constructor(jobs) {
    super("jobs:missing-dependencies");
    this.jobs = jobs;
  }
}
export class CyclicalJobReferences extends BaseMessage {
  jobs;
  constructor(jobs) {
    super("jobs:cyclical-references");
    this.jobs = jobs;
  }
}
export class JobNotFound extends BaseMessage {
  jobName;
  constructor(jobName) {
    super("job:not-found");
    this.jobName = jobName;
  }
}
export class ListJobs extends BaseMessage {
  jobs;
  constructor(jobs) {
    super("jobs:list");
    this.jobs = jobs;
  }
}
