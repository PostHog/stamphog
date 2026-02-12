import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export const todosQuery = convexQuery(api.todos.list, {});

export function useTodos() {
  return useSuspenseQuery(todosQuery);
}

export function useAddTodo() {
  return useMutation({
    mutationFn: useConvexMutation(api.todos.add).withOptimisticUpdate(
      (localStore, args) => {
        const currentTodos = localStore.getQuery(api.todos.list, {});
        if (currentTodos !== undefined) {
          const optimisticTodo = {
            _id: crypto.randomUUID() as Id<"todos">,
            _creationTime: Date.now(),
            text: args.text,
            isCompleted: false,
          };
          localStore.setQuery(api.todos.list, {}, [
            optimisticTodo,
            ...currentTodos,
          ]);
        }
      }
    ),
  });
}

export function useToggleTodo() {
  return useMutation({
    mutationFn: useConvexMutation(api.todos.toggle).withOptimisticUpdate(
      (localStore, args) => {
        const currentTodos = localStore.getQuery(api.todos.list, {});
        if (currentTodos !== undefined) {
          localStore.setQuery(
            api.todos.list,
            {},
            currentTodos.map((todo) =>
              todo._id === args.id
                ? { ...todo, isCompleted: !todo.isCompleted }
                : todo
            )
          );
        }
      }
    ),
  });
}

export function useRemoveTodo() {
  return useMutation({
    mutationFn: useConvexMutation(api.todos.remove).withOptimisticUpdate(
      (localStore, args) => {
        const currentTodos = localStore.getQuery(api.todos.list, {});
        if (currentTodos !== undefined) {
          localStore.setQuery(
            api.todos.list,
            {},
            currentTodos.filter((todo) => todo._id !== args.id)
          );
        }
      }
    ),
  });
}
