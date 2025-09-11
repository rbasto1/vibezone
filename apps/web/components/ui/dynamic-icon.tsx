import * as Icon from "lucide-react";
import type { FC } from "react";

interface DynamicIconProps {
  iconName: string;
  size?: number;
  className?: string;
}

export const DynamicIcon: FC<DynamicIconProps> = ({
  iconName,
  size = 16,
  className = "",
}) => {
  // @ts-expect-error we are forcing this
  const IconComponent = Icon[iconName];

  if (!IconComponent) {
    // Fallback to Star icon if icon not found
    return <Icon.Star size={size} className={className} />;
  }

  return <IconComponent size={size} className={className} />;
};
