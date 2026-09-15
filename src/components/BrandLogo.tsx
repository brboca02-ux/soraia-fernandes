import logoAsset from "@/assets/soraya-fernandes-logo.png.asset.json";
import headerLogoAsset from "@/assets/soraya-fernandes-logo-header.png.asset.json";

type BrandLogoProps = {
  className?: string;
  eager?: boolean;
  variant?: "full" | "header";
};

export function BrandLogo({ className = "", eager = false, variant = "full" }: BrandLogoProps) {
  const isHeader = variant === "header";

  return (
    <img
      src={isHeader ? headerLogoAsset.url : logoAsset.url}
      alt="Soraia Fernandes Moda Festa"
      width={isHeader ? 720 : 717}
      height={isHeader ? 446 : 510}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      className={`block object-contain ${className}`}
    />
  );
}