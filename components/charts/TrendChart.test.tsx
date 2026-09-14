import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrendChart } from "@/components/charts/TrendChart";

const weightSeries = [
  {
    id: "weight",
    points: [
      { date: "2026-09-01", value: 60 },
      { date: "2026-09-08", value: 61 },
      { date: "2026-09-15", value: 62 },
    ],
  },
];

const bpSeries = [
  {
    id: "systolic",
    points: [
      { date: "2026-09-01", value: 118 },
      { date: "2026-09-08", value: 120 },
    ],
  },
  {
    id: "diastolic",
    points: [
      { date: "2026-09-01", value: 76 },
      { date: "2026-09-08", value: 78 },
    ],
  },
];

describe("TrendChart", () => {
  it("renders one path per series", () => {
    const { container } = render(
      <TrendChart series={bpSeries} seriesLabels={{ systolic: "Systolic", diastolic: "Diastolic" }} ariaSummary="Blood pressure trend" emptyMessage="No readings yet" />,
    );
    expect(container.querySelectorAll("path[data-series]")).toHaveLength(2);
  });

  it("gives each series a distinct line style as well as a distinct colour", () => {
    const { container } = render(
      <TrendChart series={bpSeries} seriesLabels={{ systolic: "Systolic", diastolic: "Diastolic" }} ariaSummary="Blood pressure trend" emptyMessage="No readings yet" />,
    );
    const paths = Array.from(container.querySelectorAll("path[data-series]"));
    const dashArrays = paths.map((p) => p.getAttribute("stroke-dasharray"));
    const colours = paths.map((p) => (p as SVGPathElement).style.stroke);
    expect(new Set(dashArrays).size).toBe(2);
    expect(new Set(colours).size).toBe(2);
  });

  it("labels each series at the end of its line", () => {
    render(
      <TrendChart series={bpSeries} seriesLabels={{ systolic: "Systolic", diastolic: "Diastolic" }} ariaSummary="Blood pressure trend" emptyMessage="No readings yet" />,
    );
    expect(screen.getByText("Systolic")).toBeInTheDocument();
    expect(screen.getByText("Diastolic")).toBeInTheDocument();
  });

  it("carries an accessible text summary of the trend, not colour-and-shape alone", () => {
    render(<TrendChart series={weightSeries} seriesLabels={{ weight: "Weight" }} ariaSummary="Weight rising from 60 to 62 kg" emptyMessage="No readings yet" />);
    expect(screen.getByText("Weight rising from 60 to 62 kg")).toBeInTheDocument();
  });

  it("renders a normal-range band behind the line when one is given", () => {
    const { container } = render(
      <TrendChart
        series={weightSeries}
        seriesLabels={{ weight: "Weight" }}
        ariaSummary="Weight trend"
        emptyMessage="No readings yet"
        normalBand={{ min: 55, max: 65 }}
      />,
    );
    expect(container.querySelector("rect[data-normal-band]")).toBeInTheDocument();
  });

  it("renders no band at all when none is given", () => {
    const { container } = render(
      <TrendChart series={weightSeries} seriesLabels={{ weight: "Weight" }} ariaSummary="Weight trend" emptyMessage="No readings yet" />,
    );
    expect(container.querySelector("rect[data-normal-band]")).not.toBeInTheDocument();
  });

  it("throws in development when given a fifth series rather than silently adding a colour", () => {
    const fiveSeries = [0, 1, 2, 3, 4].map((i) => ({ id: `s${i}`, points: [{ date: "2026-09-01", value: i }] }));
    const labels = Object.fromEntries(fiveSeries.map((s) => [s.id, s.id]));
    expect(() => render(<TrendChart series={fiveSeries} seriesLabels={labels} ariaSummary="x" emptyMessage="No readings yet" />)).toThrow();
  });

  it("renders a marker and no path for a single-point series", () => {
    const single = [{ id: "weight", points: [{ date: "2026-09-01", value: 60 }] }];
    const { container } = render(
      <TrendChart series={single} seriesLabels={{ weight: "Weight" }} ariaSummary="One reading" emptyMessage="No readings yet" />,
    );
    expect(container.querySelectorAll("path[data-series]")).toHaveLength(0);
    expect(container.querySelectorAll("[data-marker]")).toHaveLength(1);
  });

  it("renders an EmptyState instead of an empty axis when there are no points at all", () => {
    const empty = [{ id: "weight", points: [] }];
    render(<TrendChart series={empty} seriesLabels={{ weight: "Weight" }} ariaSummary="" emptyMessage="Log your first reading" />);
    expect(screen.getByText("Log your first reading")).toBeInTheDocument();
    expect(document.querySelector("svg[data-trend-chart]")).not.toBeInTheDocument();
  });

  it("uses only chart-* design tokens, never a UI accent colour", () => {
    const { container } = render(
      <TrendChart series={bpSeries} seriesLabels={{ systolic: "Systolic", diastolic: "Diastolic" }} ariaSummary="Blood pressure trend" emptyMessage="No readings yet" />,
    );
    expect(container.innerHTML).not.toMatch(/accent-primary/);
  });
});
