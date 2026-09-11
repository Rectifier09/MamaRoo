import Image from "next/image";
import { PRODUCT_NAME } from "@/lib/config";

/** Chroma masks remove the supplied PNGs' opaque neutral checkerboards,
 * preserving the original artwork's contours in the two brand inks. */
export function BrandFilters() {
  return (
    <svg className="brand-filters" aria-hidden="true" width="0" height="0">
      <defs>
        <filter id="brand-ink" colorInterpolationFilters="sRGB">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  5 -5 0 0 -0.08"
            result="rust-chroma"
          />
          <feComponentTransfer in="rust-chroma" result="rust-mask">
            <feFuncA type="gamma" amplitude="1" exponent="0.45" offset="0" />
          </feComponentTransfer>
          <feFlood className="brand-rust" result="rust" />
          <feComposite in="rust" in2="rust-mask" operator="in" result="rust-art" />
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -8 8 0 0 -0.12"
            result="sage-chroma"
          />
          <feComponentTransfer in="sage-chroma" result="sage-mask">
            <feFuncA type="gamma" amplitude="1" exponent="0.45" offset="0" />
          </feComponentTransfer>
          <feFlood className="brand-sage" result="sage" />
          <feComposite in="sage" in2="sage-mask" operator="in" result="sage-art" />
          <feMerge>
            <feMergeNode in="rust-art" />
            <feMergeNode in="sage-art" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}

export function BrandWordmark() {
  return (
    <div className="brand-wordmark">
      <Image
        src="/brand/logo-with-name.png"
        alt={PRODUCT_NAME}
        width={2814}
        height={1536}
        sizes="840px"
        quality={100}
        preload
        className="brand-image"
      />
    </div>
  );
}

export function BrandIcon() {
  return (
    <Image
      src="/brand/logo-icon.png"
      alt=""
      width={1734}
      height={2295}
      sizes="300px"
      quality={100}
      preload
      className="brand-image brand-icon"
    />
  );
}
