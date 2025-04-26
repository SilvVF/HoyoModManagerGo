import { Button } from "@/components/ui/button";
import useTransitionNavigate from "@/hooks/useCrossfadeNavigate";

export default function BrowserScreen({ src }: { src: string }) {
  const navigate = useTransitionNavigate();

  return (
    <div className="flex flex-col h-screen">
      <Button className="h-30" onClick={() => navigate("/genshin")}>
        Back
      </Button>
      <iframe className="w-full h-full" src={src}></iframe>
    </div>
  );
}
