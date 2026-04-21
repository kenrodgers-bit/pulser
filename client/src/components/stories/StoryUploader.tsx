import { useState, type ReactNode } from "react";

import { Plus } from "lucide-react";

import { api } from "@/lib/api";
import { useUIStore } from "@/store/uiStore";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

type StoryUploaderProps = {
  onUploaded: () => Promise<void> | void;
  trigger?: (open: () => void) => ReactNode;
};

export const StoryUploader = ({ onUploaded, trigger }: StoryUploaderProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pushToast = useUIStore((state) => state.pushToast);

  const handleSubmit = async () => {
    if (!file) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("caption", caption);
      await api.post("/stories", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      await onUploaded();
      setOpen(false);
      setFile(null);
      setCaption("");
      pushToast({
        title: "Story posted",
        description: "Your story will disappear in 24 hours.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <Button
          variant="secondary"
          iconLeft={<Plus className="h-4 w-4" />}
          onClick={() => setOpen(true)}
        >
          Story
        </Button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Share a story">
        <div className="space-y-4">
          <label className="flex h-36 cursor-pointer items-center justify-center rounded-[14px] border border-dashed border-border bg-white/4 text-sm text-[var(--muted)] transition hover:bg-white/6">
            {file ? file.name : "Choose an image or video"}
            <input
              className="hidden"
              type="file"
              accept="image/*,video/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <textarea
            className="min-h-24 w-full rounded-[12px] border border-border bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-accent/40"
            placeholder="Add a caption..."
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
          />
          <Button className="w-full" disabled={!file || isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? "Uploading..." : "Post story"}
          </Button>
        </div>
      </Modal>
    </>
  );
};
