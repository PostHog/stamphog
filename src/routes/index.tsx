import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
} from "@ras-sh/ui";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { Doc } from "../../convex/_generated/dataModel";
import packageJson from "../../package.json" with { type: "json" };
import {
  todosQuery,
  useAddTodo,
  useRemoveTodo,
  useTodos,
  useToggleTodo,
} from "../hooks/use-todos";

export const Route = createFileRoute("/")({
  loader: async (opts) => {
    await opts.context.queryClient.ensureQueryData(todosQuery);
  },
  component: Home,
});

function TodoForm() {
  const [newTodo, setNewTodo] = useState("");
  const { mutate: addTodo } = useAddTodo();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim()) {
      addTodo({ text: newTodo });
      setNewTodo("");
    }
  };

  return (
    <form className="flex gap-4" onSubmit={handleSubmit}>
      <Input
        className="flex-1"
        onChange={(e) => setNewTodo(e.target.value)}
        placeholder="What needs to be done?"
        value={newTodo}
      />
      <Button size="default" type="submit">
        Add Todo
      </Button>
    </form>
  );
}

function TodoItem({ todo }: { todo: Doc<"todos"> }) {
  const { mutate: toggleTodo } = useToggleTodo();
  const { mutate: removeTodo } = useRemoveTodo();

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900/70">
      <Checkbox
        checked={todo.isCompleted}
        onCheckedChange={() => toggleTodo({ id: todo._id })}
      />
      <span
        className={`flex-1 text-sm transition-colors ${
          todo.isCompleted ? "text-zinc-500 line-through" : "text-zinc-200"
        }`}
      >
        {todo.text}
      </span>
      <Button
        className="opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => removeTodo({ id: todo._id })}
        size="sm"
        variant="ghost"
      >
        Delete
      </Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-zinc-800 border-dashed bg-zinc-900/30 py-12">
      <p className="font-medium text-sm text-zinc-400">No todos yet</p>
      <p className="text-xs text-zinc-500">
        Add your first todo to get started
      </p>
    </div>
  );
}

function TodoList({ todos }: { todos: Doc<"todos">[] }) {
  if (todos.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-2">
      {todos.map((todo) => (
        <TodoItem key={todo._id} todo={todo} />
      ))}
    </div>
  );
}

function Home() {
  const { data: todos } = useTodos();

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-8 py-12 sm:space-y-16 md:py-20">
      <main className="space-y-16">
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Badge variant="secondary">Template</Badge>
            <Badge variant="outline">v{packageJson.version}</Badge>
          </div>
          <h1 className="mb-8 font-bold text-4xl tracking-tight">
            ⚡ TanStack Start + Convex Template
          </h1>

          <div className="space-y-4">
            <p className="text-lg text-zinc-300 leading-relaxed">
              A full-stack template with{" "}
              <span className="font-semibold text-zinc-100">
                server-side rendering
              </span>
              ,{" "}
              <span className="font-semibold text-zinc-100">
                real-time database sync
              </span>
              , and{" "}
              <span className="font-semibold text-zinc-100">
                optimistic updates
              </span>{" "}
              out of the box.
            </p>
            <p className="text-sm text-zinc-400">
              Try the todo list below — open this page in multiple tabs to see
              real-time synchronization in action.
            </p>
          </div>
        </section>

        <section>
          <Card className="border-zinc-800">
            <CardHeader className="border-zinc-800 border-b pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Todo List</CardTitle>
                  <CardDescription className="mt-1.5">
                    Powered by Convex with SSR and optimistic updates
                  </CardDescription>
                </div>
                {todos.length > 0 && (
                  <Badge className="text-xs" variant="secondary">
                    {todos.filter((t) => !t.isCompleted).length} active
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <TodoForm />
                <TodoList todos={todos} />
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="mb-6 border-zinc-800/50 border-b pb-2 font-bold text-2xl text-zinc-100">
            Learn More
          </h2>
          <div className="space-y-3 text-zinc-300">
            <a
              className="block underline transition-colors hover:text-zinc-100"
              href="https://tanstack.com/router/latest/docs/framework/react/start/getting-started"
              rel="noopener"
              target="_blank"
            >
              TanStack Start Documentation →
            </a>
            <a
              className="block underline transition-colors hover:text-zinc-100"
              href="https://docs.convex.dev"
              rel="noopener"
              target="_blank"
            >
              Convex Documentation →
            </a>
            <a
              className="block underline transition-colors hover:text-zinc-100"
              href="https://solomou.dev"
              rel="noopener"
              target="_blank"
            >
              More templates →
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
