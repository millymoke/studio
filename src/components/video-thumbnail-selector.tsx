
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Camera } from 'lucide-react';

interface VideoThumbnailSelectorProps {
  videoFile: File;
  onFrameSelected: (dataUrl: string) => void;
}

export function VideoThumbnailSelector({ videoFile, onFrameSelected }: VideoThumbnailSelectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const url = URL.createObjectURL(videoFile);
    setVideoSrc(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoFile]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSliderChange = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleCaptureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        onFrameSelected(dataUrl);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="aspect-video w-full bg-black rounded-md overflow-hidden">
        {videoSrc && (
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-contain"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            muted
          />
        )}
      </div>

      <div className="space-y-2">
        <Slider
          min={0}
          max={duration}
          step={0.1}
          value={[currentTime]}
          onValueChange={handleSliderChange}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span>
          <span>{new Date(duration * 1000).toISOString().substr(14, 5)}</span>
        </div>
      </div>
      
      <Button onClick={handleCaptureFrame} className="w-full">
        <Camera className="mr-2 h-4 w-4" />
        Set as Cover Photo
      </Button>
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
