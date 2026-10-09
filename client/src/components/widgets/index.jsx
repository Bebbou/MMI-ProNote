import { MessageSquare, FolderOpen } from "lucide-react";
import DevoirsWidget from "./DevoirsWidget";
import NotesWidget from "./NotesWidget";
import EdtWidget from "./EdtWidget";
import WidgetCard from "./WidgetCard";

// Registre des widgets du Dashboard : id (stocké dans les préférences), libellé et rendu.
export const WIDGETS = {
  devoirs: { label: "Devoirs à rendre", Composant: DevoirsWidget },
  notes: { label: "Mes notes", Composant: NotesWidget },
  edt: { label: "Emploi du temps", Composant: EdtWidget },
  chat: {
    label: "Chat",
    Composant: () => (
      <WidgetCard to="/chat" label="Chat" icon={MessageSquare} stat="Discuter avec le groupe" />
    ),
  },
  documents: {
    label: "Cours & Ressources",
    Composant: () => (
      <WidgetCard to="/documents" label="Cours & Ressources" icon={FolderOpen} stat="Fichiers partagés" />
    ),
  },
};
