export type PipelineStatus = -1 | 0 | 1 | 10 | 20 | 50;

export const PipelineStatuses = {
    Pending: -1 as PipelineStatus,
    Success: 0 as PipelineStatus,
    Failed: 1 as PipelineStatus,
    Cancelled: 10 as PipelineStatus,
    Skipped: 20 as PipelineStatus,
    Running: 50 as PipelineStatus,
};
