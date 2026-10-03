"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight, FileText, Info, Share2, Trash2, Upload } from "lucide-react";
import { clsx } from "clsx";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { iconProps } from "@/components/ui/icon";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { Progress, Steps } from "@/components/ui/progress";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { PaletteSection } from "./palette";
import { ThemeToggle } from "./theme-toggle";

const sections = [
  { id: "palette", title: "Palette" },
  { id: "type", title: "Type scale" },
  { id: "spacing", title: "Spacing" },
  { id: "radius", title: "Radius" },
  { id: "logo", title: "Logo" },
  { id: "buttons", title: "Buttons" },
  { id: "inputs", title: "Inputs" },
  { id: "cards", title: "Cards" },
  { id: "badges", title: "Badges" },
  { id: "skeleton", title: "Skeleton" },
  { id: "progress", title: "Progress" },
  { id: "tabs", title: "Tabs" },
  { id: "switch", title: "Switch" },
  { id: "slider", title: "Slider" },
  { id: "tooltip", title: "Tooltip" },
  { id: "empty-state", title: "Empty state" },
  { id: "toasts", title: "Toasts" },
  { id: "overlays", title: "Sheet and dialog" },
] as const;

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="flex scroll-mt-6 flex-col gap-5">
      <div>
        <h2 id={`${id}-heading`} className="text-2xl font-bold text-ink">
          {title}
        </h2>
        {description && <p className="mt-1 text-base text-ink-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Demo({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-ink-muted">{label}</h3>
      <div className={clsx("flex flex-wrap items-center gap-3", className)}>{children}</div>
    </div>
  );
}

const typeScale = [
  { cls: "text-xs", size: "12 / 16", use: "Badges, captions" },
  { cls: "text-sm", size: "14 / 20", use: "Secondary UI, table cells" },
  { cls: "text-base", size: "16 / 24", use: "UI body" },
  { cls: "text-lg", size: "18 / 28", use: "Lead paragraphs, student UI body" },
  { cls: "text-xl font-semibold", size: "20 / 28", use: "Card titles" },
  { cls: "text-2xl font-bold", size: "24 / 32", use: "Section headings" },
  { cls: "font-display text-3xl", size: "30 / 36", use: "Page titles, teacher" },
  { cls: "font-display text-4xl", size: "36 / 40", use: "Landing section heads" },
  { cls: "font-display text-5xl", size: "48 / 52", use: "Landing hero" },
  { cls: "font-display text-6xl", size: "60 / 64", use: "Landing hero, desktop" },
];

const spacingScale = [
  { token: "1", px: 4, cls: "w-1" },
  { token: "2", px: 8, cls: "w-2" },
  { token: "3", px: 12, cls: "w-3" },
  { token: "4", px: 16, cls: "w-4" },
  { token: "5", px: 20, cls: "w-5" },
  { token: "6", px: 24, cls: "w-6" },
  { token: "8", px: 32, cls: "w-8" },
  { token: "10", px: 40, cls: "w-10" },
  { token: "12", px: 48, cls: "w-12" },
  { token: "16", px: 64, cls: "w-16" },
  { token: "20", px: 80, cls: "w-20" },
  { token: "24", px: 96, cls: "w-24" },
];

const radii = [
  { cls: "rounded-sm", label: "sm, 6px: badges, inputs" },
  { cls: "rounded-md", label: "md, 10px: buttons, chips" },
  { cls: "rounded-lg", label: "lg, 14px: cards" },
  { cls: "rounded-xl", label: "xl, 20px: sheets, modals" },
  { cls: "rounded-full", label: "full: pills, play button" },
];

const buttonVariants = ["primary", "secondary", "ghost", "danger"] as const;
const buttonSizes = ["sm", "md", "lg"] as const;
const badgeTones = ["neutral", "accent", "success", "warning", "danger"] as const;

const sampleOptions = (
  <>
    <option value="">Pick a level</option>
    <option value="original">Original</option>
    <option value="plain">Plain</option>
    <option value="simple">Simple</option>
  </>
);

function ButtonsSection() {
  return (
    <Section id="buttons" title="Buttons" description="One name per action. Sentence case, no all-caps, 36px targets on the teacher side and 44px for students.">
      {buttonVariants.map((variant) => (
        <Demo key={variant} label={`${variant} in sm, md, lg`}>
          {buttonSizes.map((size) => (
            <Button key={size} variant={variant} size={size}>
              Publish
            </Button>
          ))}
          <Button variant={variant} disabled>
            Publish
          </Button>
          <Button variant={variant} loading>
            Publish
          </Button>
        </Demo>
      ))}
      <Demo label="With icons">
        <Button icon={<Upload {...iconProps} />}>Upload</Button>
        <Button variant="secondary" iconTrailing={<ArrowRight {...iconProps} />}>
          Review
        </Button>
        <Button variant="danger" icon={<Trash2 {...iconProps} />}>
          Remove section
        </Button>
        <Button loading icon={<Upload {...iconProps} />}>
          Upload
        </Button>
      </Demo>
      <Demo label="Full width" className="max-w-xs">
        <Button fullWidth size="lg">
          Listen
        </Button>
      </Demo>
      <Demo label="Button links">
        <ButtonLink href="/">Go to home</ButtonLink>
        <ButtonLink href="/" variant="secondary" iconTrailing={<ArrowRight {...iconProps} />}>
          Open class page
        </ButtonLink>
        <ButtonLink href="/" variant="ghost" disabled>
          Not available
        </ButtonLink>
      </Demo>
      <Demo label="Icon buttons">
        {buttonVariants.map((variant) => (
          <IconButton key={variant} aria-label={`Share (${variant})`} variant={variant}>
            <Share2 {...iconProps} />
          </IconButton>
        ))}
        {buttonSizes.map((size) => (
          <IconButton key={size} aria-label={`Share (${size})`} variant="secondary" size={size}>
            <Share2 {...iconProps} />
          </IconButton>
        ))}
        <IconButton aria-label="Share (disabled)" variant="secondary" disabled>
          <Share2 {...iconProps} />
        </IconButton>
        <IconButton aria-label="Share (loading)" variant="secondary" loading>
          <Share2 {...iconProps} />
        </IconButton>
      </Demo>
    </Section>
  );
}

function InputsSection() {
  return (
    <Section id="inputs" title="Inputs" description="Field wires the label, hint and error to the control. Errors say what happened and what to do next.">
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Class name" hint="Students see this at the top of the class page.">
          <Input placeholder="Period 3 English" />
        </Field>
        <Field label="Class handle" error="That handle is taken. Try adding your room number.">
          <Input defaultValue="period-3" />
        </Field>
        <Field label="Disabled">
          <Input defaultValue="Not editable" disabled />
        </Field>
        <Field label="Large (student side)">
          <Input size="lg" placeholder="Class code" />
        </Field>
        <Field label="Notes for the class" optional>
          <Textarea placeholder="Anything students should know before they read." />
        </Field>
        <Field label="Auto-grow" hint="Grows with the text instead of scrolling.">
          <Textarea autoGrow rows={2} placeholder="Keep typing to see it grow." />
        </Field>
        <Field label="Level">
          <Select defaultValue="">{sampleOptions}</Select>
        </Field>
        <Field label="Level" error="Pick a level before you publish.">
          <Select defaultValue="">{sampleOptions}</Select>
        </Field>
        <Field label="Disabled select">
          <Select defaultValue="plain" disabled>
            {sampleOptions}
          </Select>
        </Field>
        <Field label="Large select">
          <Select size="lg" defaultValue="simple">
            {sampleOptions}
          </Select>
        </Field>
      </div>
    </Section>
  );
}

function CardsSection() {
  return (
    <Section id="cards" title="Cards" description="A border, never a shadow. Shadows are for floating sheets and popovers only.">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>The water cycle</CardTitle>
              <CardDescription>Uploaded 2 days ago, 3 sections</CardDescription>
            </div>
            <StatusBadge status="published" />
          </CardHeader>
          <CardBody>Three levels ready. 24 students have opened it.</CardBody>
          <CardFooter>
            <Button variant="ghost">Duplicate</Button>
            <Button variant="secondary">Share</Button>
          </CardFooter>
        </Card>
        <Card padding="sm">
          <CardHeader>
            <CardTitle as="h4">Small padding</CardTitle>
            <StatusBadge status="needs_review" />
          </CardHeader>
          <CardBody>2 facts were dropped in section 2. Check them before you publish.</CardBody>
        </Card>
        <Card padding="none" className="overflow-hidden">
          <div className="bg-surface-sunken px-4 py-3 text-sm font-semibold text-ink-muted">No padding, custom header</div>
          <div className="p-4">
            <CardTitle>Draft</CardTitle>
            <CardDescription>Nothing published yet.</CardDescription>
          </div>
        </Card>
        <Card padding="lg">
          <CardTitle>Large padding</CardTitle>
          <CardBody className="mt-2">Used for the single big card on an onboarding step.</CardBody>
        </Card>
      </div>
    </Section>
  );
}

function BadgesSection() {
  return (
    <Section id="badges" title="Badges" description="Soft background, strong text. Every pair is asserted at 4.5:1 or better.">
      <Demo label="Tones">
        {badgeTones.map((tone) => (
          <Badge key={tone} tone={tone}>
            {tone}
          </Badge>
        ))}
      </Demo>
      <Demo label="With dot">
        {badgeTones.map((tone) => (
          <Badge key={tone} tone={tone} dot>
            {tone}
          </Badge>
        ))}
      </Demo>
      <Demo label="Material status">
        <StatusBadge status="draft" />
        <StatusBadge status="needs_review" />
        <StatusBadge status="published" />
      </Demo>
    </Section>
  );
}

function SkeletonSection() {
  return (
    <Section id="skeleton" title="Skeleton" description="Reserves the exact size. Pulses only when motion is allowed.">
      <Demo label="Block, text, circle" className="items-start">
        <Skeleton width={240} height={96} />
        <Skeleton variant="text" width={280} lines={3} />
        <Skeleton variant="circle" size={48} />
      </Demo>
      <Demo label="Material card, loading" className="items-start">
        <Card className="w-full max-w-sm" role="status" aria-label="Loading material">
          <div className="flex items-center gap-3">
            <Skeleton variant="circle" size={40} label={null} />
            <div className="flex-1">
              <Skeleton variant="text" lines={2} label={null} />
            </div>
          </div>
          <Skeleton className="mt-4" height={120} label={null} />
        </Card>
      </Demo>
    </Section>
  );
}

const stepItems = [
  { id: "read", label: "Reading your file", detail: "12 pages", state: "done" },
  { id: "clean", label: "Cleaning up the text", state: "done" },
  { id: "levels", label: "Writing Plain and Simple levels", detail: "About a minute", state: "active" },
  { id: "check", label: "Checking facts against the original", state: "pending" },
  { id: "audio", label: "Preparing audio", detail: "We could not reach the voice service. We will try again.", state: "failed" },
] as const;

function ProgressSection() {
  return (
    <Section id="progress" title="Progress" description="Determinate bars and the per-step list used on the processing screen.">
      <div className="grid max-w-xl gap-4">
        <Progress label="Uploading" value={0} />
        <Progress label="Adapting" value={40} />
        <Progress label="Done" value={100} />
        <Progress label="Small, no value" value={65} size="sm" showValue={false} />
        <Progress label="Hidden label" value={25} hideLabel />
      </div>
      <Demo label="Steps with every state" className="items-start">
        <Steps items={[...stepItems]} />
      </Demo>
    </Section>
  );
}

function TabsSection() {
  return (
    <Section id="tabs" title="Tabs" description="Arrow keys move between tabs and select. Home and End jump to the ends.">
      <Tabs defaultValue="original">
        <TabList aria-label="Reading level">
          <Tab value="original">Original</Tab>
          <Tab value="plain" icon={<FileText {...iconProps} />}>
            Plain
          </Tab>
          <Tab value="simple">Simple</Tab>
          <Tab value="audio" disabled>
            Audio
          </Tab>
        </TabList>
        <TabPanel value="original">
          <p className="max-w-prose text-base">The original text, exactly as uploaded. Always one tap away.</p>
        </TabPanel>
        <TabPanel value="plain">
          <p className="max-w-prose text-base">Shorter sentences and everyday words. The meaning stays the same.</p>
        </TabPanel>
        <TabPanel value="simple">
          <p className="max-w-prose text-base">One idea per sentence, the key words explained.</p>
        </TabPanel>
        <TabPanel value="audio">
          <p className="max-w-prose text-base">Audio is not ready yet.</p>
        </TabPanel>
      </Tabs>
    </Section>
  );
}

function SwitchSection() {
  const [ruler, setRuler] = useState(true);
  return (
    <Section id="switch" title="Switch" description="A real button with role switch. The label is clickable.">
      <div className="grid gap-5 md:grid-cols-2">
        <Switch label="Reading ruler" description="Dims everything but the current line." checked={ruler} onCheckedChange={setRuler} />
        <Switch label="One section at a time" defaultChecked={false} />
        <Switch label="Disabled, on" defaultChecked disabled />
        <Switch label="Disabled, off" disabled />
        <Switch label="Large, student side" description="44px hit area." size="lg" defaultChecked />
        <Switch label="Large, off" size="lg" />
      </div>
    </Section>
  );
}

function SliderSection() {
  const [size, setSize] = useState(18);
  return (
    <Section id="slider" title="Slider" description="Native range input with a readout and 44px step buttons for touch.">
      <div className="grid max-w-xl gap-6">
        <Slider label="Text size" min={14} max={28} step={1} value={size} onValueChange={setSize} formatValue={(v) => `${v}px`} />
        <Slider label="Reading speed" min={100} max={180} step={5} defaultValue={150} formatValue={(v) => `${v} wpm`} />
        <Slider label="Letter spacing" min={0} max={0.2} step={0.05} defaultValue={0.05} formatValue={(v) => `${v.toFixed(2)}em`} />
        <Slider label="Without step buttons" defaultValue={30} stepButtons={false} />
        <Slider label="Disabled" defaultValue={60} disabled />
      </div>
    </Section>
  );
}

function TooltipSection() {
  return (
    <Section id="tooltip" title="Tooltip" description="Hover or focus, 150ms delay, opacity only. Escape closes it.">
      <Demo label="On a button and an icon button">
        <Tooltip content="Copies the class link to your clipboard.">
          <Button variant="secondary">Share</Button>
        </Tooltip>
        <Tooltip content="Rotating the link signs every student out of the old one." side="bottom">
          <IconButton aria-label="About rotating links" variant="ghost">
            <Info {...iconProps} />
          </IconButton>
        </Tooltip>
      </Demo>
    </Section>
  );
}

function EmptyStateSection() {
  return (
    <Section id="empty-state" title="Empty state" description="Warm, compact, exactly one action.">
      <div className="grid gap-4 md:grid-cols-2">
        <EmptyState
          icon={<Upload {...iconProps} />}
          title="No readings yet"
          description="Upload a reading. Share one link. Every student can read it."
          action={<Button icon={<Upload {...iconProps} />}>Upload</Button>}
          secondary={{ label: "See an example class", href: "/" }}
        />
        <EmptyState
          title="Nothing to review"
          description="Every published reading has been checked."
          action={<Button variant="secondary">Upload another</Button>}
        />
      </div>
    </Section>
  );
}

function ToastsSection() {
  const { toast } = useToast();
  return (
    <Section id="toasts" title="Toasts" description="Bottom center on phones, bottom right on desktop. Five seconds, paused on hover or focus, three at a time.">
      <Demo label="Triggers">
        <Button variant="secondary" onClick={() => toast({ title: "Link copied" })}>
          Neutral
        </Button>
        <Button
          variant="secondary"
          onClick={() => toast({ variant: "success", title: "Published", description: "Students can open it now." })}
        >
          Success
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            toast({
              variant: "danger",
              title: "We could not save that",
              description: "Your connection dropped. Your draft is kept on this device.",
              action: { label: "Try again", onClick: () => toast({ title: "Saved" }) },
            })
          }
        >
          Danger with action
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            for (let i = 1; i <= 5; i += 1) toast({ title: `Toast ${i} of 5`, description: "Only three show at once." });
          }}
        >
          Show five
        </Button>
      </Demo>
    </Section>
  );
}

function OverlaysSection() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { toast } = useToast();

  const handleConfirm = () => {
    setConfirming(true);
    setTimeout(() => {
      setConfirming(false);
      setConfirmOpen(false);
      toast({ title: "Reading removed" });
    }, 1000);
  };

  return (
    <Section id="overlays" title="Sheet and dialog" description="Both use the native dialog element. Escape, backdrop click, and the close button all return focus to the trigger.">
      <Demo label="Triggers">
        <Button variant="secondary" onClick={() => setSheetOpen(true)}>
          Open sheet
        </Button>
        <Button variant="secondary" onClick={() => setDialogOpen(true)}>
          Open dialog
        </Button>
        <Button variant="danger" onClick={() => setConfirmOpen(true)}>
          Remove reading
        </Button>
      </Demo>

      <Sheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Reading settings"
        description="Changes apply right away and stay on this device."
        footer={<Button onClick={() => setSheetOpen(false)}>Done</Button>}
      >
        <div className="flex flex-col gap-6 py-2">
          <Slider label="Text size" min={14} max={28} defaultValue={18} formatValue={(v) => `${v}px`} />
          <Switch label="Reading ruler" description="Dims everything but the current line." size="lg" />
          <Field label="Font">
            <Select size="lg" defaultValue="atkinson">
              <option value="atkinson">Atkinson Hyperlegible</option>
              <option value="lexend">Lexend</option>
              <option value="opendyslexic">OpenDyslexic</option>
            </Select>
          </Field>
        </div>
      </Sheet>

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Share this reading"
        description="Anyone with the link can read it. No sign-in needed."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Close
            </Button>
            <Button
              icon={<Share2 {...iconProps} />}
              onClick={() => {
                setDialogOpen(false);
                toast({ title: "Link copied" });
              }}
            >
              Copy link
            </Button>
          </>
        }
      >
        <Field label="Class link" hint="Rotate the link if it gets out.">
          <Input readOnly defaultValue="readeasy.app/c/period-3" />
        </Field>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove this reading?"
        description="Students lose the link right away. You can upload it again later."
        confirmLabel="Remove"
        destructive
        loading={confirming}
        onConfirm={handleConfirm}
      />
    </Section>
  );
}

function StyleguideContent() {
  return (
    <Container as="main" width="teacher" className="py-8 lg:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div className="flex flex-col gap-3">
          <Logo size={28} href={null} />
          <h1 className="font-display text-3xl text-ink">Styleguide</h1>
          <p className="max-w-prose text-base text-ink-muted">Every component in every state. Shown only when dev tools are on.</p>
        </div>
        <ThemeToggle />
      </header>

      <div className="mt-8 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <nav aria-label="Sections" className="lg:sticky lg:top-6 lg:self-start">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 lg:flex-col lg:gap-y-1.5">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="rounded-sm text-sm text-ink-muted transition-colors duration-fast ease-brand hover:text-ink"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 flex flex-col gap-14 lg:mt-0">
          <Section id="palette" title="Palette" description="Values are read from the live stylesheet, so this page follows the theme toggle.">
            <PaletteSection />
          </Section>

          <Section id="type" title="Type scale" description="Atkinson Hyperlegible Next for UI and students. Fraunces for teacher headlines at 28px and up.">
            <ul className="flex flex-col gap-4">
              {typeScale.map((row) => (
                <li key={row.cls} className="flex flex-col gap-1 border-b border-border pb-4 last:border-b-0">
                  <p className={clsx(row.cls, "text-ink")}>Every reading, ready for every reader.</p>
                  <span className="text-xs text-ink-muted">
                    <code>{row.cls}</code>, {row.size}. {row.use}.
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="spacing" title="Spacing" description="4px base. Gutters are 16px on phones, 24px on tablets, 32px on desktop.">
            <ul className="flex flex-col gap-2">
              {spacingScale.map((row) => (
                <li key={row.token} className="flex items-center gap-3 text-sm">
                  <span className="tabular w-10 text-ink-muted">{row.token}</span>
                  <span aria-hidden="true" className={clsx("h-4 rounded-sm bg-accent", row.cls)} />
                  <span className="tabular text-ink-muted">{row.px}px</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="radius" title="Radius">
            <ul className="flex flex-wrap gap-6">
              {radii.map((row) => (
                <li key={row.cls} className="flex flex-col items-center gap-2 text-center">
                  <span aria-hidden="true" className={clsx("block size-16 border border-border-strong bg-accent-soft", row.cls)} />
                  <span className="max-w-32 text-xs text-ink-muted">{row.label}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="logo" title="Logo" description="Mark plus wordmark, baseline aligned. Below 24px the mark stands alone.">
            <ul className="flex flex-col gap-6">
              <li className="flex items-center gap-4">
                <Logo size={16} wordmark={false} href={null} />
                <span className="text-sm text-ink-muted">16px, mark only</span>
              </li>
              <li className="flex items-center gap-4">
                <Logo size={24} href={null} />
                <span className="text-sm text-ink-muted">24px, minimum lockup</span>
              </li>
              <li className="flex items-center gap-4">
                <Logo size={32} href={null} />
                <span className="text-sm text-ink-muted">32px, app header</span>
              </li>
              <li className="flex items-center gap-4">
                <Logo size={64} href={null} />
                <span className="text-sm text-ink-muted">64px, landing</span>
              </li>
            </ul>
          </Section>

          <ButtonsSection />
          <InputsSection />
          <CardsSection />
          <BadgesSection />
          <SkeletonSection />
          <ProgressSection />
          <TabsSection />
          <SwitchSection />
          <SliderSection />
          <TooltipSection />
          <EmptyStateSection />
          <ToastsSection />
          <OverlaysSection />
        </div>
      </div>
    </Container>
  );
}

export function StyleguideClient() {
  return (
    <ToastProvider>
      <StyleguideContent />
    </ToastProvider>
  );
}
