import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs } from "@/components/ui/Tabs";

const tabs = [
  { id: "articles", label: "Articles" },
  { id: "videos", label: "Videos" },
  { id: "audios", label: "Audios" },
];

describe("Tabs", () => {
  it("marks exactly one tab as selected", () => {
    render(<Tabs tabs={tabs} activeId="videos" onChange={() => {}} />);
    const selected = screen.getAllByRole("tab").filter((t) => t.getAttribute("aria-selected") === "true");
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveAccessibleName("Videos");
  });

  it("signals the active tab with weight as well as colour", () => {
    render(<Tabs tabs={tabs} activeId="videos" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: "Videos" }).className).toContain("font-medium");
  });

  it("reports the tab the user chose", async () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} activeId="articles" onChange={onChange} />);
    await userEvent.click(screen.getByRole("tab", { name: "Audios" }));
    expect(onChange).toHaveBeenCalledWith("audios");
  });
});
