import Select, { type Option, type SelectProps } from "@/components/ui/Select";

type Props = Omit<SelectProps, "options"> & {
  label: string;
  options: Option[];
};

export default function SelectCampo({ label, options, ...rest }: Props) {
  return <Select label={label} options={options} {...rest} />;
}
