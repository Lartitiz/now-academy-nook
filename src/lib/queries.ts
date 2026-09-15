import { queryOptions } from "@tanstack/react-query";
import { getLesson, listModulesWithLessons, listAdminModules } from "./content.functions";
import { getMyAccess, listMembers } from "./members.functions";
import { listMyProgress } from "./progress.functions";

type Callable<T extends (...args: never[]) => unknown> = (...args: Parameters<T>) => ReturnType<T>;

export const accessOptions = (fn: Callable<typeof getMyAccess>) =>
  queryOptions({ queryKey: ["access"], queryFn: () => fn() });
export const modulesOptions = (fn: Callable<typeof listModulesWithLessons>) =>
  queryOptions({ queryKey: ["modules"], queryFn: () => fn() });
export const progressOptions = (fn: Callable<typeof listMyProgress>) =>
  queryOptions({ queryKey: ["progress"], queryFn: () => fn() });
export const lessonOptions = (fn: Callable<typeof getLesson>, id: string) =>
  queryOptions({ queryKey: ["lesson", id], queryFn: () => fn({ data: { id } }) });
export const adminModulesOptions = (fn: Callable<typeof listAdminModules>) =>
  queryOptions({ queryKey: ["admin-modules"], queryFn: () => fn() });
export const membersOptions = (fn: Callable<typeof listMembers>) =>
  queryOptions({ queryKey: ["admin-members"], queryFn: () => fn() });
