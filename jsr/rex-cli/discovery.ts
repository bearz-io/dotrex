import {
    DiscoveryPipeline,
    DiscoveryPipelineContext,
    RexfileDiscovery,
} from "@dotrex/runtime/discovery";
import { Context } from "@dotrex/core/context";
import { DefaultLoggingMessageBus } from "@dotrex/runtime/bus";
import { ServicesContainer } from "@dotrex/runtime/di";
import { writer } from "@dotrex/runtime/host/writer";

const discoveryPipeline = new DiscoveryPipeline();
discoveryPipeline.use(new RexfileDiscovery());

let tasksCache: undefined | string[] = undefined;
let jobsCache: undefined | string[] = undefined;
let deploymentsCache: undefined | string[] = undefined;
let allCache: undefined | string[] = undefined;

export async function discoverTargets(): Promise<void> {
    if (tasksCache === undefined) {
        const bus = new DefaultLoggingMessageBus();
        const services = new ServicesContainer();
        services.set("Bus", bus);
        services.set("Rexwriter", writer);

        const ctx = new Context(services);

        const discoveryContext = new DiscoveryPipelineContext(ctx);

        const res = await discoveryPipeline.run(discoveryContext);
        if (!res.error) {
            tasksCache = res.tasks.keys().toArray() ?? [];
            jobsCache = res.jobs.keys().toArray() ?? [];
            deploymentsCache = res.deployments.keys().toArray() ?? [];
            allCache = [...new Set(tasksCache!.concat(jobsCache!).concat(deploymentsCache!))];
        }
    }
}

export async function getTasks(): Promise<string[]> {
    await discoverTargets();
    return tasksCache ?? [];
}

export async function getJobs(): Promise<string[]> {
    await discoverTargets();
    return jobsCache ?? [];
}

export async function getDeployments(): Promise<string[]> {
    await discoverTargets();
    return deploymentsCache ?? [];
}

export async function getAll(): Promise<string[]> {
    await discoverTargets();
    return allCache ?? [];
}
