import { Switch } from "@/components/ui/switch";

interface SearchToggleProps {
  isSearchMode: boolean;
  setIsSearchMode: (value: boolean) => void;
}

export function SearchToggle({
  isSearchMode,
  setIsSearchMode,
}: SearchToggleProps) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm">Search Mode</span>
      <Switch
        checked={isSearchMode}
        onCheckedChange={(checked) => setIsSearchMode(checked)}
      />
    </div>
  );
}
