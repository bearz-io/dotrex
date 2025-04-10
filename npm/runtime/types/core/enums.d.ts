export type PipelineStatus = -1 | 0 | 1 | 10 | 20 | 50;
export declare const PipelineStatuses: {
    Pending: PipelineStatus;
    Success: PipelineStatus;
    Failed: PipelineStatus;
    Cancelled: PipelineStatus;
    Skipped: PipelineStatus;
    Running: PipelineStatus;
};
