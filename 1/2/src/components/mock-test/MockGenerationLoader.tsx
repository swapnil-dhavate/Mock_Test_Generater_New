import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface MockGenerationLoaderProps {
  isVisible: boolean;
  currentStep: number; // 0 to 4
}

const steps = [
  "Initializing AI Engine...",
  "Analyzing weak areas based on past performance...",
  "Selecting questions matching exam pattern...",
  "Applying difficulty calibration...",
  "Finalizing Mock Test paper..."
];

export const MockGenerationLoader: React.FC<MockGenerationLoaderProps> = ({ isVisible, currentStep }) => {
  if (!isVisible) return null;

  const progress = Math.min(100, Math.max(0, currentStep * 25)); // 5 steps total
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md shadow-lg border-primary/20">
        <CardContent className="pt-6 pb-8 space-y-6 flex flex-col items-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{progress}%</span>
            </div>
          </div>
          
          <div className="space-y-2 text-center w-full">
            <h3 className="text-lg font-semibold animate-pulse text-slate-800 dark:text-slate-200">
              Generating Custom Mock Test
            </h3>
            <p className="text-sm text-muted-foreground min-h-[20px] transition-all duration-300">
              {steps[currentStep] || "Processing..."}
            </p>
          </div>
          
          <Progress value={progress} className="w-full h-2" />
        </CardContent>
      </Card>
    </div>
  );
};
