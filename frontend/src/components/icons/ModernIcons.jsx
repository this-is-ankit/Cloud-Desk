function BaseIcon({ icon, className, ...props }) {
  return (
    <span
      className={`inline-flex items-center justify-center leading-none shrink-0 ${className || ""}`}
      {...props}
    >
      <iconify-icon
        icon={icon}
        width="1em"
        height="1em"
        style={{ display: "block" }}
      />
    </span>
  );
}

export function ArrowRightIcon(props) {
  return <BaseIcon icon="ph:arrow-right" {...props} />;
}
export function ArrowLeftIcon(props) {
  return <BaseIcon icon="ph:arrow-left" {...props} />;
}
export function CheckIcon(props) {
  return <BaseIcon icon="ph:check" {...props} />;
}
export function CheckCircleIcon(props) {
  return <BaseIcon icon="ph:check-circle" {...props} />;
}
export function XCircleIcon(props) {
  return <BaseIcon icon="ph:x-circle" {...props} />;
}
export function Code2Icon(props) {
  return <BaseIcon icon="ph:code-block" {...props} />;
}
export function SparklesIcon(props) {
  return <BaseIcon icon="ph:sparkle" {...props} />;
}
export function UsersIcon(props) {
  return <BaseIcon icon="ph:users-three" {...props} />;
}
export function VideoIcon(props) {
  return <BaseIcon icon="ph:video-camera" {...props} />;
}
export function ZapIcon(props) {
  return <BaseIcon icon="ph:lightning" {...props} />;
}
export function ChevronRightIcon(props) {
  return <BaseIcon icon="ph:caret-right" {...props} />;
}
export function Loader2Icon(props) {
  return <BaseIcon icon="ph:spinner-gap" {...props} />;
}
export function LogOutIcon(props) {
  return <BaseIcon icon="ph:sign-out" {...props} />;
}
export function KeyIcon(props) {
  return <BaseIcon icon="ph:key" {...props} />;
}
export function DoorOpenIcon(props) {
  return <BaseIcon icon="ph:door-open" {...props} />;
}
export function UserMinusIcon(props) {
  return <BaseIcon icon="ph:user-minus" {...props} />;
}
export function UserPlusIcon(props) {
  return <BaseIcon icon="ph:user-plus" {...props} />;
}
export function UserCircleIcon(props) {
  return <BaseIcon icon="ph:user-circle" {...props} />;
}
export function CodeIcon(props) {
  return <BaseIcon icon="ph:code" {...props} />;
}
export function EyeOffIcon(props) {
  return <BaseIcon icon="ph:eye-slash" {...props} />;
}
export function ShieldAlertIcon(props) {
  return <BaseIcon icon="ph:shield-warning" {...props} />;
}
export function ShieldCheckIcon(props) {
  return <BaseIcon icon="ph:shield-check" {...props} />;
}
export function ListChecksIcon(props) {
  return <BaseIcon icon="ph:list-checks" {...props} />;
}
export function PencilIcon(props) {
  return <BaseIcon icon="ph:pencil-line" {...props} />;
}
export function PencilOffIcon(props) {
  return <BaseIcon icon="ph:pencil-slash" {...props} />;
}
export function PresentationIcon(props) {
  return <BaseIcon icon="ph:presentation-chart" {...props} />;
}
export function RadioTowerIcon(props) {
  return <BaseIcon icon="ph:broadcast" {...props} />;
}
export function CpuIcon(props) {
  return <BaseIcon icon="ph:cpu" {...props} />;
}
export function MessageSquareIcon(props) {
  return <BaseIcon icon="ph:chat-circle-text" {...props} />;
}
export function MenuIcon(props) {
  return <BaseIcon icon="ph:list" {...props} />;
}
export function XIcon(props) {
  return <BaseIcon icon="ph:x" {...props} />;
}
export function PlayIcon(props) {
  return <BaseIcon icon="ph:play" {...props} />;
}
export function Clock3Icon(props) {
  return <BaseIcon icon="ph:timer" {...props} />;
}
export function SendIcon(props) {
  return <BaseIcon icon="ph:paper-plane-tilt" {...props} />;
}
export function TrophyIcon(props) {
  return <BaseIcon icon="ph:trophy" {...props} />;
}
export function UploadIcon(props) {
  return <BaseIcon icon="ph:upload-simple" {...props} />;
}
export function ArchiveIcon(props) {
  return <BaseIcon icon="ph:archive" {...props} />;
}
export function AlertCircleIcon(props) {
  return <BaseIcon icon="ph:warning-circle" {...props} />;
}
export function CalendarIcon(props) {
  return <BaseIcon icon="ph:calendar" {...props} />;
}
export function CalendarPlusIcon(props) {
  return <BaseIcon icon="ph:calendar-plus" {...props} />;
}
export function ClipboardTextIcon(props) {
  return <BaseIcon icon="ph:clipboard-text" {...props} />;
}
export function ClipboardCheckIcon(props) {
  return <BaseIcon icon="ph:clipboard-text" {...props} />;
}
export function FilterIcon(props) {
  return <BaseIcon icon="ph:funnel" {...props} />;
}
export function SaveIcon(props) {
  return <BaseIcon icon="ph:floppy-disk" {...props} />;
}
export function SettingsIcon(props) {
  return <BaseIcon icon="ph:gear-six" {...props} />;
}
export function EyeIcon(props) {
  return <BaseIcon icon="ph:eye" {...props} />;
}
export function WrenchIcon(props) {
  return <BaseIcon icon="ph:wrench" {...props} />;
}
export function LaptopIcon(props) {
  return <BaseIcon icon="ph:laptop" {...props} />;
}
export function MoonIcon(props) {
  return <BaseIcon icon="ph:moon" {...props} />;
}
export function SunIcon(props) {
  return <BaseIcon icon="ph:sun" {...props} />;
}
export function BookOpenIcon(props) {
  return <BaseIcon icon="ph:book-open-text" {...props} />;
}
export function LayoutDashboardIcon(props) {
  return <BaseIcon icon="ph:squares-four" {...props} />;
}
export function Clock(props) {
  return <BaseIcon icon="ph:clock" {...props} />;
}
export function Code2(props) {
  return <BaseIcon icon="ph:code-block" {...props} />;
}
export function Users(props) {
  return <BaseIcon icon="ph:users-three" {...props} />;
}
export function Trophy(props) {
  return <BaseIcon icon="ph:trophy" {...props} />;
}
export function Loader(props) {
  return <BaseIcon icon="ph:spinner-gap" {...props} />;
}
export function LoaderIcon(props) {
  return <BaseIcon icon="ph:spinner-gap" {...props} />;
}
export function PlusIcon(props) {
  return <BaseIcon icon="ph:plus" {...props} />;
}
export function User(props) {
  return <BaseIcon icon="ph:user" {...props} />;
}
export function CrownIcon(props) {
  return <BaseIcon icon="ph:crown" {...props} />;
}
export function SearchIcon(props) {
  return <BaseIcon icon="ph:magnifying-glass" {...props} />;
}
export function UserCheckIcon(props) {
  return <BaseIcon icon="ph:user-check" {...props} />;
}
export function PlusCircleIcon(props) {
  return <BaseIcon icon="ph:plus-circle" {...props} />;
}
