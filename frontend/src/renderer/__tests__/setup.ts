import { vi } from "vitest";
import "@testing-library/jest-dom";

Element.prototype.scrollIntoView = vi.fn();
