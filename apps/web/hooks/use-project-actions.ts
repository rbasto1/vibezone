import { trpc } from "@/lib/trpc/client";

export function useProjectActions() {
  const utils = trpc.useUtils();

  const deleteProject = (
    projectId: string,
    strategy: "move" | "delete",
    targetProjectId?: string
  ) => {
    return utils.client.projects.delete
      .mutate({
        projectId,
        strategy,
        targetProjectId,
      })
      .then(() => utils.projects.invalidate());
  };

  const updateProject = (
    id: string,
    data: Parameters<typeof utils.client.projects.update.mutate>[0]["data"]
  ) => {
    return utils.client.projects.update
      .mutate({
        id,
        data,
      })
      .then(() => utils.projects.invalidate());
  };

  const createProject = (
    data: Parameters<typeof utils.client.projects.create.mutate>[0]
  ) => {
    return utils.client.projects.create
      .mutate(data)
      .then(() => utils.projects.invalidate());
  };

  return {
    deleteProject,
    updateProject,
    createProject,
  };
}
