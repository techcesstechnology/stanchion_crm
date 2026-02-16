import { useEffect, useState } from "react";
import { TaskService } from "@/services/taskService";
import { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { cn } from "@/lib/cn";

export default function Tasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

    // Form
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        priority: "medium" as Task['priority'],
        dueDate: ""
    });

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const data = await TaskService.getTasks();
            setTasks(data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch tasks");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newStatus = destination.droppableId as Task['status'];
        const newTasks = tasks.map(t =>
            t.id === draggableId ? { ...t, status: newStatus } : t
        );
        setTasks(newTasks);

        try {
            await TaskService.updateTask(draggableId, { status: newStatus });
        } catch (error) {
            console.error(error);
            toast.error("Failed to update task status");
            fetchTasks(); // Revert on failure
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title) {
            toast.error("Title is required");
            return;
        }

        setSubmitting(true);
        try {
            await TaskService.addTask({
                title: formData.title,
                description: formData.description,
                priority: formData.priority,
                dueDate: formData.dueDate,
                status: 'todo'
            });
            toast.success("Task created");
            setIsAddModalOpen(false);
            setFormData({ title: "", description: "", priority: "medium", dueDate: "" });
            fetchTasks();
        } catch (error) {
            console.error(error);
            toast.error("Failed to create task");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this task?")) return;
        try {
            await TaskService.deleteTask(id);
            setTasks(tasks.filter(t => t.id !== id));
            toast.success("Task deleted");
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete task");
        }
    };

    const columns: { id: Task['status'], title: string }[] = [
        { id: 'todo', title: 'To Do' },
        { id: 'in-progress', title: 'In Progress' },
        { id: 'done', title: 'Done' }
    ];

    const getPriorityColor = (priority: Task['priority']) => {
        switch (priority) {
            case 'high': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
            case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
            case 'low': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
        }
    };

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
                    <p className="text-muted-foreground">Manage your team's workload</p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Task
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-10">Loading tasks...</div>
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden">
                        {columns.map(col => (
                            <div key={col.id} className="flex flex-col bg-slate-100 dark:bg-slate-800/50 rounded-lg p-4 h-full">
                                <h2 className="font-semibold mb-4 flex items-center justify-between">
                                    {col.title}
                                    <span className="bg-slate-200 dark:bg-slate-700 text-xs px-2 py-1 rounded-full">
                                        {tasks.filter(t => t.status === col.id).length}
                                    </span>
                                </h2>
                                <Droppable droppableId={col.id}>
                                    {(provided) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className="flex-1 space-y-3 overflow-y-auto min-h-[100px]"
                                        >
                                            {tasks.filter(t => t.status === col.id).map((task, index) => (
                                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                                    {(provided) => (
                                                        <Card
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={cn(
                                                                "bg-background shadow-sm hover:shadow-md transition-all duration-300 cursor-grab active:cursor-grabbing group overflow-hidden",
                                                                expandedTaskId === task.id ? "ring-2 ring-orange-500/30 shadow-lg scale-[1.02] z-10" : ""
                                                            )}
                                                            onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                                        >
                                                            <CardContent className="p-4 space-y-3">
                                                                <div className="flex justify-between items-start gap-4">
                                                                    <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex-1">
                                                                        {task.title}
                                                                    </h3>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDelete(task.id);
                                                                        }}
                                                                        className="text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                                                                        title="Delete Task"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>

                                                                {task.description && (
                                                                    <div className={cn(
                                                                        "text-sm text-muted-foreground transition-all duration-300 ease-in-out",
                                                                        expandedTaskId === task.id ? "max-h-[1000px] opacity-100" : "max-h-12 opacity-80"
                                                                    )}>
                                                                        <p className={cn(
                                                                            expandedTaskId === task.id ? "" : "line-clamp-2"
                                                                        )}>
                                                                            {task.description}
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                                                                    <div className={cn("flex items-center px-2 py-0.5 rounded-full font-medium", getPriorityColor(task.priority))}>
                                                                        <AlertCircle className="h-3 w-3 mr-1" />
                                                                        <span className="capitalize">{task.priority}</span>
                                                                    </div>
                                                                    {task.dueDate && (
                                                                        <div className="flex items-center text-muted-foreground">
                                                                            <Calendar className="h-3 w-3 mr-1" />
                                                                            {new Date(task.dueDate).toLocaleDateString()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        ))}
                    </div>
                </DragDropContext>
            )}

            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Create New Task"
                description="Add a new task to your board."
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input id="title" name="title" value={formData.title} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input id="description" name="description" value={formData.description} onChange={handleInputChange} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <select
                                id="priority"
                                name="priority"
                                title="Select Priority"
                                aria-label="Select Task Priority"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.priority}
                                onChange={handleInputChange}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dueDate">Due Date</Label>
                            <Input id="dueDate" name="dueDate" type="date" value={formData.dueDate} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitting}>Save Task</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
