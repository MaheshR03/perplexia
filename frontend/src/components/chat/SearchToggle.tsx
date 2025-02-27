import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SearchIcon } from "lucide-react";

interface SearchToggleProps {
  isSearchMode: boolean;
  setIsSearchMode: (mode: boolean) => void;
}

export function SearchToggle({
  isSearchMode,
  setIsSearchMode,
}: SearchToggleProps) {
  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="search-mode"
        checked={isSearchMode}
        onCheckedChange={setIsSearchMode}
      />
      <Label
        htmlFor="search-mode"
        className="flex items-center gap-1 cursor-pointer"
      >
        <SearchIcon className="h-4 w-4" />
        <span>Search Mode</span>
      </Label>
    </div>
  );
}
