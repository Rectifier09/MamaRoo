import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StageProgress } from "@/components/patterns/StageProgress";

describe("StageProgress", () => {
  it("reports progress to assistive technology as a meter, not just a picture", () => {
    render(<StageProgress stage={4} totalStages={9} label="Stage 4 of 9" />);
    const meter = screen.getByRole("progressbar");
    expect(meter).toHaveAttribute("aria-valuenow", "4");
    expect(meter).toHaveAttribute("aria-valuemax", "9");
    expect(meter).toHaveAccessibleName("Stage 4 of 9");
  });

  it("renders one marker per stage", () => {
    render(<StageProgress stage={4} totalStages={9} label="Stage 4 of 9" />);
    expect(screen.getAllByTestId("stage-marker")).toHaveLength(9);
  });

  it("marks completed stages with a state attribute, not colour alone", () => {
    render(<StageProgress stage={3} totalStages={9} label="Stage 3 of 9" />);
    const done = screen.getAllByTestId("stage-marker").filter((m) => m.dataset.state === "complete");
    expect(done).toHaveLength(3);
  });

  it("clamps a stage beyond the last one", () => {
    render(<StageProgress stage={12} totalStages={9} label="Stage 9 of 9" />);
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "9");
  });
});
