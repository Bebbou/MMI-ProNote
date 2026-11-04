import { MessageSquare, FolderOpen } from "lucide-react";
import DevoirsWidget from "./DevoirsWidget";
import NotesWidget from "./NotesWidget";
import EdtWidget from "./EdtWidget";
import SemaineWidget from "./SemaineWidget";
import WidgetCard from "./WidgetCard";

// Registre des widgets du Dashboard : id (stocké dans les préférences), libellé et rendu.
// Chaque tuile reçoit `donnees` (devoirs, cours, notes, erreurs) chargées une seule fois
// par le Dashboard ; les raccourcis n'en ont pas besoin.
export const WIDGETS = {
  edt: { label: "Emploi du temps", Composant: EdtWidget },
  devoirs: { label: "Devoirs à rendre", Composant: DevoirsWidget },
  notes: { label: "Mes notes", Composant: NotesWidget },
  semaine: { label: "Cette semaine", Composant: SemaineWidget },
  chat: {
    label: "Chat",
    Composant: () => <WidgetCard to="/chat" label="Chat" icon={MessageSquare} />,
  },
  documents: {
    label: "Documents",
    Composant: () => <WidgetCard to="/documents" label="Documents" icon={FolderOpen} />,
  },
};
