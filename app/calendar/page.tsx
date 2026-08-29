'use client';

import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase, Event, EventType, EventColor, Attachment } from '@/lib/supabase/client';
import { AIChat } from '@/components/ai/ai-chat';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, MapPin, Plus, Sparkles, ChevronLeft, ChevronRight, Trash2, X, Pencil, Paperclip, FileText, Upload, Loader as Loader2 } from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  format,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

const colorConfig: Record<EventColor, { label: string; dot: string; bg: string; border: string; text: string; solid: string; ring: string }> = {
  blue: { label: 'Blau', dot: 'bg-blue-500', bg: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-blue-400', solid: 'bg-blue-500', ring: 'ring-blue-500' },
  green: { label: 'Grün', dot: 'bg-green-500', bg: 'bg-green-500/15', border: 'border-green-500/30', text: 'text-green-400', solid: 'bg-green-500', ring: 'ring-green-500' },
  orange: { label: 'Orange', dot: 'bg-orange-500', bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-400', solid: 'bg-orange-500', ring: 'ring-orange-500' },
  purple: { label: 'Lila', dot: 'bg-purple-500', bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-400', solid: 'bg-purple-500', ring: 'ring-purple-500' },
  red: { label: 'Rot', dot: 'bg-red-500', bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-red-400', solid: 'bg-red-500', ring: 'ring-red-500' },
  teal: { label: 'Türkis', dot: 'bg-teal-500', bg: 'bg-teal-500/15', border: 'border-teal-500/30', text: 'text-teal-400', solid: 'bg-teal-500', ring: 'ring-teal-500' },
};

const allColors: EventColor[] = ['blue', 'green', 'orange', 'purple', 'red', 'teal'];

const eventTypeLabels: Record<EventType, string> = {
  work: 'Arbeit',
  school: 'Schule',
  training: 'Training',
  leisure: 'Freizeit',
  meal: 'Mahlzeit',
  appointment: 'Termin',
};

const weekDayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function CalendarPage() {
  return (
    <AppShell>
      <CalendarContent />
    </AppShell>
  );
}

function CalendarContent() {
  const { session } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const monthKey = format(currentMonth, 'yyyy-MM');

  const loadEvents = useCallback(() => {
    if (!session?.user?.id) return;
    setLoading(true);
    const ms = startOfMonth(currentMonth);
    const me = endOfMonth(ms);
    const gs = startOfWeek(ms, { weekStartsOn: 1 });
    const ge = endOfWeek(me, { weekStartsOn: 1 });
    supabase
      .from('events')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('start_time', gs.toISOString())
      .lte('start_time', ge.toISOString())
      .order('start_time', { ascending: true })
      .then(({ data }) => {
        setEvents((data as Event[]) || []);
        setLoading(false);
      });
  }, [session?.user?.id, monthKey]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const eventsByDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.start_time), day));

  const selectedDayEvents = eventsByDay(selectedDate);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (!error) {
      setEvents(events.filter((e) => e.id !== id));
      toast.success('Termin gelöscht');
    } else {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setShowEventDialog(true);
  };

  const handleAdd = () => {
    setEditingEvent(null);
    setShowEventDialog(true);
  };

  const handleDialogClose = () => {
    setShowEventDialog(false);
    setEditingEvent(null);
  };

  const handleDialogSaved = () => {
    setShowEventDialog(false);
    setEditingEvent(null);
    loadEvents();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-jakarta text-2xl font-bold tracking-tight">Kalender</h2>
          <p className="text-sm text-muted-foreground">
            {format(currentMonth, 'MMMM yyyy', { locale: de })}
          </p>
        </div>
        <Button
          onClick={handleAdd}
          size="icon"
          className="h-10 w-10 rounded-xl bg-gradient-calendar shadow-md"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <button
          onClick={() => {
            setCurrentMonth(new Date());
            setSelectedDate(new Date());
          }}
          className="text-sm font-semibold hover:text-primary transition-colors"
        >
          {format(currentMonth, 'MMMM yyyy', { locale: de })}
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden border-border/60 p-3 shadow-sm">
        {/* Weekday Headers */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {weekDayLabels.map((day) => (
            <div key={day} className="text-center text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const dayEvents = eventsByDay(day);
            const today = isToday(day);
            const isSelected = isSameDay(day, selectedDate);
            const inCurrentMonth = isSameMonth(day, currentMonth);

            return (
              <button
                key={format(day, 'yyyy-MM-dd')}
                onClick={() => setSelectedDate(day)}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-all ${
                  isSelected
                    ? 'bg-primary/15 ring-2 ring-primary/50'
                    : today
                    ? 'bg-primary/5'
                    : 'hover:bg-white/5'
                } ${!inCurrentMonth ? 'opacity-30' : ''}`}
              >
                <span
                  className={`text-sm font-medium ${
                    today
                      ? 'flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold'
                      : isSelected
                      ? 'font-bold text-primary'
                      : 'text-foreground'
                  }`}
                >
                  {format(day, 'd')}
                </span>

                {/* Event dots */}
                {dayEvents.length > 0 && (
                  <div className="absolute bottom-1 flex items-center gap-0.5">
                    {dayEvents.slice(0, 3).map((e) => {
                      const color = (e.color as EventColor) || 'blue';
                      return (
                        <span
                          key={e.id}
                          className={`h-1.5 w-1.5 rounded-full ${colorConfig[color].dot}`}
                        />
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] text-muted-foreground">+</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Selected Day Events */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-jakarta text-base font-bold">
              {isToday(selectedDate) ? 'Heute' : format(selectedDate, 'EEEE', { locale: de })}
            </h3>
            <p className="text-xs text-muted-foreground">
              {format(selectedDate, 'd. MMMM yyyy', { locale: de })}
            </p>
          </div>
          <Button
            onClick={handleAdd}
            size="sm"
            variant="secondary"
            className="h-8 rounded-lg text-xs"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Termin
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-shimmer rounded-xl" />
            ))}
          </div>
        ) : selectedDayEvents.length > 0 ? (
          <div className="space-y-2">
            {selectedDayEvents.map((event) => {
              const color = (event.color as EventColor) || 'blue';
              const config = colorConfig[color];
              return (
                <Card
                  key={event.id}
                  className={`flex items-start gap-3 p-3 shadow-sm animate-slide-up border ${config.border} ${config.bg}`}
                >
                  <div className={`mt-1 h-10 w-1.5 shrink-0 rounded-full ${config.solid}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{event.title}</p>
                      <Badge variant="secondary" className={`text-[10px] ${config.text}`}>
                        {eventTypeLabels[event.event_type as EventType] || 'Termin'}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.start_time), 'HH:mm', { locale: de })}–{format(new Date(event.end_time), 'HH:mm', { locale: de })}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="mt-1.5 text-xs text-muted-foreground">{event.description}</p>
                    )}
                    {event.attachments && event.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {event.attachments.map((att, i) => (
                          <span key={i} className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[10px] text-muted-foreground">
                            <Paperclip className="h-3 w-3" />
                            {att.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(event)}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center gap-2 p-8 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Keine Termine an diesem Tag</p>
            <p className="text-xs text-muted-foreground/60">Tippe auf „Termin" um einen hinzuzufügen</p>
          </Card>
        )}
      </div>

      {/* Smart Scheduling */}
      <div>
        <h3 className="mb-3 font-jakarta text-base font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-calendar" />
          Kalender-KI
        </h3>
        <AIChat persona="calendar" />
      </div>

      {/* Event Dialog */}
      {showEventDialog && (
        <EventDialog
          date={selectedDate}
          event={editingEvent}
          onClose={handleDialogClose}
          onSaved={handleDialogSaved}
        />
      )}
    </div>
  );
}

function EventDialog({
  date,
  event,
  onClose,
  onSaved,
}: {
  date: Date;
  event: Event | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { session } = useAuth();
  const isEditing = !!event;

  const [title, setTitle] = useState(event?.title || '');
  const [eventType, setEventType] = useState<EventType>(event?.event_type || 'appointment');
  const [color, setColor] = useState<EventColor>((event?.color as EventColor) || 'blue');
  const [startTime, setStartTime] = useState(event ? format(new Date(event.start_time), 'HH:mm') : '10:00');
  const [endTime, setEndTime] = useState(event ? format(new Date(event.end_time), 'HH:mm') : '11:00');
  const [location, setLocation] = useState(event?.location || '');
  const [description, setDescription] = useState(event?.description || '');
  const [attachments, setAttachments] = useState<Attachment[]>(event?.attachments || []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !session?.user?.id) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      const { error } = await supabase.storage
        .from('event-attachments')
        .upload(filePath, file);

      if (error) {
        toast.error(`Upload fehlgeschlagen: ${file.name}`);
      } else {
        setAttachments((prev) => [...prev, { name: file.name, url: filePath }]);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = async (index: number) => {
    const att = attachments[index];
    if (att.url && att.url !== '#') {
      await supabase.storage.from('event-attachments').remove([att.url]);
    }
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim() || !session?.user?.id) return;
    setSaving(true);

    const start = new Date(date);
    const [sh, sm] = startTime.split(':').map(Number);
    start.setHours(sh, sm, 0, 0);
    const end = new Date(date);
    const [eh, em] = endTime.split(':').map(Number);
    end.setHours(eh, em, 0, 0);

    const payload = {
      user_id: session.user.id,
      title: title.trim(),
      event_type: eventType,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      location: location.trim() || null,
      description: description.trim() || null,
      color,
      attachments: attachments.length > 0 ? attachments : null,
    };

    let error;
    if (isEditing && event) {
      ({ error } = await supabase.from('events').update(payload).eq('id', event.id));
    } else {
      ({ error } = await supabase.from('events').insert(payload));
    }

    setSaving(false);
    if (error) {
      toast.error('Termin konnte nicht gespeichert werden');
      return;
    }
    toast.success(isEditing ? 'Termin aktualisiert!' : 'Termin hinzugefügt!');
    onSaved();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-[480px] max-h-[85vh] flex-col rounded-t-3xl bg-card shadow-2xl animate-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Sticky Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
          <h3 className="font-jakarta text-lg font-bold">
            {isEditing ? 'Termin bearbeiten' : 'Termin hinzufügen'}
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Date display */}
        <div className="mb-3 rounded-xl bg-white/5 px-3 py-2 text-center">
          <p className="text-sm font-semibold">{format(date, 'EEEE, d. MMMM yyyy', { locale: de })}</p>
        </div>

        <div className="space-y-3">
          {/* Title */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Titel</label>
            <input
              type="text"
              placeholder="z.B. Meeting, Arzttermin…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus:border-primary/40 focus:outline-none"
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Startzeit</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus:border-primary/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Endzeit</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus:border-primary/40 focus:outline-none"
              />
            </div>
          </div>

          {/* Event Type */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Kategorie</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(eventTypeLabels) as EventType[]).map((type) => {
                const selected = eventType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setEventType(type)}
                    className={`rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all ${
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    {eventTypeLabels[type]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Farbe</label>
            <div className="flex items-center gap-2.5">
              {allColors.map((c) => {
                const config = colorConfig[c];
                const selected = color === c;
                return (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                      selected ? `ring-2 ring-offset-2 ring-offset-card ${config.ring}` : ''
                    }`}
                    title={config.label}
                  >
                    <span className={`h-6 w-6 rounded-full ${config.solid}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Ort (optional)</label>
            <input
              type="text"
              placeholder="z.B. Büro, Zuhause…"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus:border-primary/40 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Beschreibung (optional)</label>
            <textarea
              placeholder="Notizen zum Termin…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[60px] w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary/40 focus:outline-none"
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Paperclip className="h-3.5 w-3.5" />
              Anhänge (PDF, Bilder)
            </label>
            {attachments.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-xs truncate">{att.name}</span>
                    <button
                      onClick={() => handleRemoveAttachment(i)}
                      className="text-muted-foreground transition-colors hover:text-destructive shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp,image/gif,image/heic,image/heif"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground transition-all hover:border-calendar/40 hover:bg-calendar/5 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Wird hochgeladen…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Datei auswählen
                </>
              )}
            </button>
          </div>

        </div>
        </div>

        {/* Sticky Save Button */}
        <div className="flex gap-2 border-t border-border/50 px-5 py-4 bg-card">
          {isEditing && (
            <Button
              variant="ghost"
              onClick={onClose}
              className="h-11 rounded-xl px-5 text-sm"
            >
              Abbrechen
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="h-11 flex-1 rounded-xl bg-gradient-calendar text-sm font-semibold shadow-md"
          >
            {saving ? 'Speichern…' : isEditing ? 'Speichern' : 'Termin hinzufügen'}
          </Button>
        </div>
      </div>
    </div>
  );
}
