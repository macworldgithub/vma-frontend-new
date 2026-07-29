import React, { useState } from 'react';
import { X, Bot, Link as LinkIcon, Video, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { meetingService } from '@/services/meetingService';
import { toast } from 'sonner';

interface SummonBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (meetingId: string) => void;
  initialTitle?: string;
  initialMeetingLink?: string;
}

export function SummonBotModal({ isOpen, onClose, onSuccess, initialTitle = '', initialMeetingLink = '' }: SummonBotModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [meetingLink, setMeetingLink] = useState(initialMeetingLink);
  const [platform, setPlatform] = useState('microsoft_teams');
  const [isLoading, setIsLoading] = useState(false);
  const [deployedLinks, setDeployedLinks] = useState<string[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      meetingService.getMyMeetings()
        .then(meetings => {
          setDeployedLinks(meetings.filter((m: any) => m.recallBotId || (m.botStatus && m.botStatus !== 'none')).map((m: any) => m.meetingLink).filter(Boolean));
        })
        .catch(console.error);
    }
  }, [isOpen]);

  const isDeployed = meetingLink.trim() !== '' && deployedLinks.includes(meetingLink.trim());

  const isSubmittingRef = React.useRef(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !meetingLink.trim()) {
      toast.error('Please provide a title and meeting link.');
      return;
    }

    if (isSubmittingRef.current || isLoading) {
      return;
    }
    isSubmittingRef.current = true;
    setIsLoading(true);

    try {
      const response = await meetingService.summonBot({
        title: title.trim(),
        meetingLink: meetingLink.trim(),
        platform,
      });
      toast.success('AI Bot deployed successfully!');
      onSuccess(response.meetingId);
      
      // Reset form
      setTitle(initialTitle);
      setMeetingLink(initialMeetingLink);
      setPlatform('microsoft_teams');
    } catch (error: any) {
      console.error('Failed to summon bot:', error);
      toast.error(error.response?.data?.message || 'Failed to deploy AI Bot. Please try again.');
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-card border border-border shadow-2xl rounded-3xl overflow-hidden animate-scale-in">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x" />
        
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <h2 className="text-xl sm:text-2xl font-black uppercase text-foreground tracking-tight">
                  Deploy <span className="text-primary">AI Bot</span>
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                Summon the OmniSuiteAI assistant to an external meeting.
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Session Title
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g., Q3 Planning with Clients"
                  className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Platform
              </label>
              <div className="relative">
                <Video className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-muted/30 border border-border rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all appearance-none"
                >
                  <option value="microsoft_teams">Microsoft Teams</option>
                  <option value="zoom">Zoom</option>
                  <option value="google_meet">Google Meet</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Meeting Link
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="url"
                  required
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://teams.microsoft.com/l/meetup-join/..."
                  className="w-full bg-muted/30 border border-border rounded-xl pl-10 pr-4 py-3 text-sm font-medium focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            {isDeployed && (
              <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 text-[10px] font-black uppercase tracking-widest">
                Bot has already been deployed to that meeting.
              </div>
            )}
            <div className="pt-4 flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="flex-1 rounded-xl h-12 text-xs font-black uppercase tracking-widest"
              >
                Cancel
              </Button>
              <div className="flex-[2] relative" title={isDeployed ? "Bot has already been deployed to that meeting" : ""}>
                <Button 
                  type="submit" 
                  disabled={isLoading || isSubmittingRef.current || !title.trim() || !meetingLink.trim() || isDeployed}
                  className="w-full rounded-xl h-12 text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 gap-2 disabled:opacity-50 cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      {isDeployed ? "Bot Deployed" : "Deploy Bot"}
                      <Bot className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
