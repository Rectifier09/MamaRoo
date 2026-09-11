import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton, SkeletonCard } from "@/components/patterns/Skeleton";

describe("Skeleton", () => {
  it("renders placeholder shapes rather than a spinner", () => {
    render(<Skeleton lines={3} />);
    expect(screen.getAllByTestId("skeleton-line")).toHaveLength(3);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("announces that content is loading", () => {
    render(<Skeleton />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("renders a card-shaped skeleton matching the destination layout", () => {
    render(<SkeletonCard />);
    expect(screen.getByTestId("skeleton-card")).toBeInTheDocument();
  });
});
