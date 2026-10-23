export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden className="flex items-center justify-center rounded-[9px] bg-cta font-bold text-white" style={{ width: size, height: size }}>Р</span>
      <span className="text-[18px] font-bold">Расчётка</span>
    </span>
  );
}
