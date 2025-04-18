import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function BrowserScreen({ src }: { src: string }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen">
      <Button className="h-30" onClick={() => navigate("/genshin")}>
        Back
      </Button>
      <iframe className="w-full h-full" src={src}></iframe>
    </div>
  );
}
