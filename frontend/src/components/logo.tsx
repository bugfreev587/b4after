import Link from "next/link";

export function Logo({
  href = "/",
  size = "default",
}: {
  href?: string;
  size?: "small" | "default";
}) {
  const iconSize = size === "small" ? "h-7 w-7" : "h-9 w-9";
  const iconRadius = size === "small" ? "rounded-[7px]" : "rounded-[10px]";
  const handleSize = size === "small" ? "h-3 w-3" : "h-3.5 w-3.5";
  const textSize = size === "small" ? "text-lg" : "text-xl";

  return (
    <Link href={href} className="flex items-center gap-2.5 group">
      {/* Slider icon */}
      <div
        className={`${iconSize} ${iconRadius} relative overflow-hidden flex items-center justify-center`}
        style={{
          background: "linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)",
        }}
      >
        {/* Before half overlay */}
        <div className="absolute left-0 top-0 w-1/2 h-full bg-white/15 border-r-2 border-white/90" />
        {/* Slider handle */}
        <div
          className={`${handleSize} rounded-full bg-white border-2 border-white/90 relative z-10 shadow-sm`}
        />
      </div>
      {/* Wordmark */}
      <span className={`${textSize} font-extrabold tracking-tight`}>
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(135deg, #833AB4, #E1306C, #F77737)",
          }}
        >
          B4
        </span>
        <span className="text-white">After</span>
      </span>
    </Link>
  );
}

/** Light-background variant for public pages */
export function LogoLight({
  href = "/",
  size = "default",
}: {
  href?: string;
  size?: "small" | "default";
}) {
  const iconSize = size === "small" ? "h-7 w-7" : "h-9 w-9";
  const iconRadius = size === "small" ? "rounded-[7px]" : "rounded-[10px]";
  const handleSize = size === "small" ? "h-3 w-3" : "h-3.5 w-3.5";
  const textSize = size === "small" ? "text-lg" : "text-xl";

  return (
    <Link href={href} className="flex items-center gap-2.5">
      <div
        className={`${iconSize} ${iconRadius} relative overflow-hidden flex items-center justify-center`}
        style={{
          background: "linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)",
        }}
      >
        <div className="absolute left-0 top-0 w-1/2 h-full bg-white/15 border-r-2 border-white/90" />
        <div
          className={`${handleSize} rounded-full bg-white border-2 border-white/90 relative z-10 shadow-sm`}
        />
      </div>
      <span className={`${textSize} font-extrabold tracking-tight`}>
        <span
          className="bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(135deg, #833AB4, #E1306C, #F77737)",
          }}
        >
          B4
        </span>
        <span className="text-gray-900">After</span>
      </span>
    </Link>
  );
}
