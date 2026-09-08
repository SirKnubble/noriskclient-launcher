"use client";

import { Modal } from "../ui/Modal";
import { ProfileSelectionModalContent } from "./ProfileSelectionModalContent";

interface ProfileSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVersionChange: (versionId: string) => void;
  title?: string;
}

export function ProfileSelectionModal({
  isOpen,
  onClose,
  onVersionChange,
  title = "select profile",
}: ProfileSelectionModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <Modal title={title} onClose={onClose} width="xl" contentClassName="p-0">
      <ProfileSelectionModalContent
        onVersionChange={onVersionChange}
        onClose={onClose}
        title={title}
      />
    </Modal>
  );
}
