import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, query, orderBy, deleteDoc } from "firebase/firestore";
import { Task } from "@/types";

const TASK_COLLECTION = "tasks";

export const TaskService = {
    addTask: async (task: Omit<Task, "id" | "createdAt">) => {
        const data = {
            ...task,
            createdAt: serverTimestamp(),
        };
        return await addDoc(collection(db, TASK_COLLECTION), data);
    },

    getTasks: async (): Promise<Task[]> => {
        const q = query(collection(db, TASK_COLLECTION), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Task));
    },

    updateTask: async (id: string, updates: Partial<Task>) => {
        const docRef = doc(db, TASK_COLLECTION, id);
        await updateDoc(docRef, updates);
    },

    deleteTask: async (id: string) => {
        const docRef = doc(db, TASK_COLLECTION, id);
        await deleteDoc(docRef);
    }
};
