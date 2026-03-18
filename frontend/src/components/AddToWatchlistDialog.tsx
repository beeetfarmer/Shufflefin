import { useState } from "react";
import { ListPlus, Loader2, Plus } from "lucide-react";
import type { MediaItem } from "@/api/types";
import { useToast } from "@/hooks/use-toast";
import {
  useWatchlists,
  useCreateWatchlist,
  useAddWatchlistItem,
} from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddToWatchlistDialogProps {
  item: MediaItem;
  triggerClassName?: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(error.message) as { detail?: string; error?: string };
    if (typeof parsed.detail === "string" && parsed.detail.trim()) {
      return parsed.detail;
    }
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    // Not a JSON error payload, fall through to plain message.
  }

  return error.message || fallback;
}

const AddToWatchlistDialog = ({ item, triggerClassName }: AddToWatchlistDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<number | null>(null);
  const [newWatchlistName, setNewWatchlistName] = useState("");

  const { toast } = useToast();
  const { data: watchlists = [], isLoading: isWatchlistsLoading } = useWatchlists(open);
  const createWatchlistMutation = useCreateWatchlist();
  const addWatchlistItemMutation = useAddWatchlistItem();

  const isSaving =
    createWatchlistMutation.isPending || addWatchlistItemMutation.isPending;

  const closeDialog = () => {
    setOpen(false);
    setSelectedWatchlistId(null);
    setNewWatchlistName("");
  };

  const handleAddToExisting = async () => {
    if (selectedWatchlistId == null) {
      toast({
        title: "Select a watchlist",
        description: "Pick a watchlist to add this item.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addWatchlistItemMutation.mutateAsync({
        watchlistId: selectedWatchlistId,
        request: { item_id: item.id },
      });

      const watchlistName =
        watchlists.find((wl) => wl.id === selectedWatchlistId)?.name ?? "watchlist";

      toast({
        title: "Added to watchlist",
        description: `"${item.title}" was added to "${watchlistName}".`,
      });
      closeDialog();
    } catch (error) {
      toast({
        title: "Could not add item",
        description: getErrorMessage(
          error,
          "StreamyStats rejected this add request.",
        ),
        variant: "destructive",
      });
    }
  };

  const handleCreateAndAdd = async () => {
    const trimmedName = newWatchlistName.trim();
    if (!trimmedName) {
      toast({
        title: "Watchlist name required",
        description: "Enter a name for the new watchlist.",
        variant: "destructive",
      });
      return;
    }

    try {
      const created = await createWatchlistMutation.mutateAsync({
        name: trimmedName,
      });

      await addWatchlistItemMutation.mutateAsync({
        watchlistId: created.id,
        request: { item_id: item.id },
      });

      toast({
        title: "Watchlist created",
        description: `"${item.title}" was added to "${created.name}".`,
      });
      closeDialog();
    } catch (error) {
      toast({
        title: "Could not create watchlist",
        description: getErrorMessage(
          error,
          "StreamyStats could not create the watchlist or add the item.",
        ),
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName ?? "w-full"}
      >
        <ListPlus className="w-4 h-4" />
        Add To Watchlist
      </Button>

      <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : closeDialog())}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Add To Watchlist</DialogTitle>
            <DialogDescription>
              Add <span className="text-foreground font-medium">{item.title}</span> to an existing
              StreamyStats watchlist, or create a new watchlist and add it there.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Existing watchlists</p>

              {isWatchlistsLoading && (
                <p className="text-sm text-muted-foreground">Loading watchlists...</p>
              )}

              {!isWatchlistsLoading && watchlists.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No watchlists found. Create one below.
                </p>
              )}

              {watchlists.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-md border border-border/60 p-2 space-y-2">
                  {watchlists.map((watchlist) => (
                    <button
                      key={watchlist.id}
                      type="button"
                      onClick={() => setSelectedWatchlistId(watchlist.id)}
                      className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${
                        selectedWatchlistId === watchlist.id
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/60 bg-secondary/30 text-foreground hover:border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{watchlist.name}</span>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="secondary"
                            className="text-xs border-border/40"
                          >
                            {watchlist.item_count}
                          </Badge>
                          {watchlist.allowed_item_type && (
                            <Badge
                              variant="secondary"
                              className="text-xs border-border/40"
                            >
                              {watchlist.allowed_item_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="secondary"
                onClick={handleAddToExisting}
                disabled={isSaving || isWatchlistsLoading || watchlists.length === 0 || selectedWatchlistId == null}
              >
                {addWatchlistItemMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add to Selected Watchlist"
                )}
              </Button>
            </div>

            <div className="h-px bg-border/60" />

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Create new watchlist</p>
              <div className="flex gap-2">
                <Input
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  placeholder="My Watchlist"
                  disabled={isSaving}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isSaving && newWatchlistName.trim()) {
                      e.preventDefault();
                      handleCreateAndAdd();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleCreateAndAdd}
                  disabled={isSaving || !newWatchlistName.trim()}
                >
                  {createWatchlistMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create & Add
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog} disabled={isSaving}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddToWatchlistDialog;
