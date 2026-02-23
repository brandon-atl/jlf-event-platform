"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, Eye, Edit, Send } from "lucide-react";
import { toast } from "sonner";

import { auth } from "@/lib/api";
import { colors } from "@/lib/theme";
import { initials, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CoCreator {
  id: string;
  name: string;
  email: string;
  assigned_events: string[];
  last_active?: string;
}

export default function CoCreatorsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  // In a real app, this would fetch from the API.
  // For now we show an empty state or placeholder data.
  const coCreators: CoCreator[] = [];

  const handleInvite = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    if (email) {
      auth.sendMagicLink(email).then(() => {
        toast.success("Magic link sent");
        setDialogOpen(false);
      }).catch(() => {
        toast.error("Failed to send invite");
      });
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold"
            style={{
              color: colors.forest,
              fontFamily: "var(--font-dm-serif), serif",
            }}
          >
            Co-Creators
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Manage co-host access to event data
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="text-white font-semibold rounded-xl"
              style={{ background: colors.canopy }}
            >
              <UserPlus size={15} />
              Invite Co-Creator
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle
                style={{
                  color: colors.forest,
                  fontFamily: "var(--font-dm-serif), serif",
                }}
              >
                Invite Co-Creator
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Name
                  </Label>
                  <Input
                    name="name"
                    className="mt-1 rounded-xl"
                    placeholder="Co-creator name"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Email
                  </Label>
                  <Input
                    name="email"
                    type="email"
                    required
                    className="mt-1 rounded-xl"
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="text-white rounded-xl"
                  style={{ background: colors.canopy }}
                >
                  <Send size={14} />
                  Send Magic Link
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Co-Creator Cards */}
      {coCreators.length > 0 ? (
        coCreators.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: colors.bark }}
              >
                {initials(c.name)}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{c.name}</p>
                <p className="text-xs text-gray-400">{c.email}</p>
                {c.last_active && (
                  <p className="text-[10px] text-gray-300 mt-0.5">
                    Last active: {formatDate(c.last_active)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {c.assigned_events.map((evt) => (
                <span
                  key={evt}
                  className="text-xs px-2.5 py-1 rounded-full border font-medium"
                  style={{
                    background: `${colors.canopy}08`,
                    color: colors.canopy,
                    borderColor: `${colors.canopy}25`,
                  }}
                >
                  {evt}
                </span>
              ))}
              <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium flex items-center gap-1">
                <Eye size={11} />
                Read-only
              </span>
              <button className="p-2 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition">
                <Edit size={15} />
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-16 text-gray-400">
          <UserPlus size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No co-creators added yet</p>
          <p className="text-xs mt-1">
            Invite co-creators to give them read-only access to event data
          </p>
        </div>
      )}
    </div>
  );
}
