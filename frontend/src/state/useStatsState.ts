import { getStats } from "@/data/stats";
import { useStateProducer } from "@/lib/utils";
import { types } from "wailsjs/go/models";
import { LogDebug } from "wailsjs/runtime/runtime";
import { ChartConfig } from "@/components/ui/chart";

export type ChartItem = {
    game: string;
    config: ChartConfig;
    total: number;
    data: {
      file: string;
      size: number;
      fill: string;
    }[];
  };

function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

const stringToColour = (str: string) => {
    let hash = 0;
    str.split("").forEach((char) => {
      hash = char.charCodeAt(0) + ((hash << 5) - hash);
    });
    let colour = "#";
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff;
      colour += value.toString(16).padStart(2, "0");
    }
    return colour;
  };
  
  function bytesToMB(bytes: number): number {
    return bytes / (1024 * 1024); // 1024 * 1024 = 1,048,576
  }
  
  // Transformation function
  function transformDownloadStatsToChartData(data: types.FileInfo[]) {
    const chartData = data.map((fileInfo: types.FileInfo) => {
      const split = fileInfo.file.split("\\");
      return {
        file: split[split.length - 1],
        size: bytesToMB(fileInfo.bytes),
        fill: stringToColour(fileInfo.file),
      };
    });
  
    const chartConfig = {
      visitors: { label: "Visitors" },
      ...chartData.reduce((acc, { file, fill }) => {
        acc[file] = {
          label: capitalizeFirstLetter(file), // Use file name for label
          color: fill, // Assign the generated random color
        };
        return acc;
      }, {} as Record<string, { label: string; color: string }>),
    };
  
    return { chartData, chartConfig };
  }

export const useStatsState = (defaultValue: ChartItem[] | undefined) => useStateProducer<ChartItem[] | undefined>(
    defaultValue,
    async (update) => {
      const stats = await getStats();

      const charts = stats.data.map((data) => {
        const split = data[0].file.split("\\");
        let game = split[split.length - 1];

        LogDebug(game);

        const { chartData, chartConfig } = transformDownloadStatsToChartData(
          data.slice(1, data.length)
        );

        return {
          game: game,
          config: chartConfig,
          data: chartData,
          total: data.reduce((acc, curr) => acc + curr.bytes, 0),
        } as ChartItem;
      });

      update(charts);
  });