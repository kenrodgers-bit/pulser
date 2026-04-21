import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { StoryGroup } from "@/types";
import { StoryViewer } from "./StoryViewer";

const storyGroup: StoryGroup = {
  user: {
    id: "user-2",
    username: "maya",
    displayName: "Maya Quinn",
    avatarUrl: "https://example.com/maya.jpg",
  },
  stories: [
    {
      id: "story-1",
      userId: "user-2",
      mediaUrl: "https://example.com/story.jpg",
      mediaType: "image",
      thumbnailUrl: "https://example.com/story-thumb.jpg",
      caption: "Golden hour",
      viewers: [],
      reactions: [],
      expiresAt: "2026-04-22T10:00:00.000Z",
      createdAt: "2026-04-21T10:00:00.000Z",
    },
  ],
};

afterEach(() => {
  cleanup();
});

describe("StoryViewer", () => {
  it("renders real emoji presets and posts the selected reaction", async () => {
    const onReact = vi.fn();
    const onViewed = vi.fn();

    render(
      <StoryViewer
        open
        group={storyGroup}
        onClose={vi.fn()}
        onReact={onReact}
        onReply={vi.fn()}
        onViewed={onViewed}
      />,
    );

    await waitFor(() => expect(onViewed).toHaveBeenCalledWith("story-1"));

    fireEvent.click(screen.getByRole("button", { name: "❤️" }));

    expect(onReact).toHaveBeenCalledWith("story-1", "❤️");
  });

  it("keeps quick reactions tappable inside the draggable viewer", async () => {
    const onReact = vi.fn();
    const onViewed = vi.fn();
    const onClose = vi.fn();

    render(
      <StoryViewer
        open
        group={storyGroup}
        onClose={onClose}
        onReact={onReact}
        onReply={vi.fn()}
        onViewed={onViewed}
      />,
    );

    await waitFor(() => expect(onViewed).toHaveBeenCalledWith("story-1"));

    const fireReaction = screen.getByRole("button", { name: "🔥" });
    fireEvent.pointerDown(fireReaction, { pointerType: "touch" });
    fireEvent.click(fireReaction);

    expect(onReact).toHaveBeenCalledWith("story-1", "🔥");
    expect(onClose).not.toHaveBeenCalled();
  });
});
