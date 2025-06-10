import Image from "next/image";
import type { TNodePolkadotKusama } from "@paraspell/sdk-pjs";
import { Check } from "lucide-react";
import type { FC } from "react";
import type { SelectProps } from "@radix-ui/react-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getParachainIcon } from "@/utils/getParachainIcon";

type Option = {
  value: TNodePolkadotKusama;
  label: string;
};

type Props = SelectProps & {
  options: Option[];
  placeholder?: string;
};

export const ParachainSelect: FC<Props> = ({
  options,
  value,
  onValueChange,
  placeholder,
  ...rest
}) => {
  const selectedOption = options.find((opt) => opt.value === value);
  const icon = value ? getParachainIcon(value as TNodePolkadotKusama) : null;

  return (
    <Select onValueChange={onValueChange} value={value} {...rest}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>
          <div className="flex items-center gap-2">
            {icon && (
              <Image
                src={icon}
                width={16}
                height={16}
                alt={selectedOption?.label ?? ""}
              />
            )}
            <span>{selectedOption?.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              <Image
                src={getParachainIcon(option.value)}
                width={16}
                height={16}
                alt={option.label}
              />
              <span>{option.label}</span>
              {value === option.value && (
                <Check size={18} className="ml-auto" />
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
