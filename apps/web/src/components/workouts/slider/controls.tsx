import { ChevronLeft, ChevronRight, Columns, Dumbbell, Eye } from 'lucide-react';
import type React from 'react';
import { ControlCard } from '@/components/common/controlCard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface SliderControlsProps {
    currentIndex: number;
    slideCount: number;
    miniMode: boolean;
    onMiniModeChange: (checked: boolean) => void;
    slidesToShow: number;
    onSlidesToShowChange: (value: number) => void;
    responsiveColumns: number;
    onPrev: () => void;
    onNext: () => void;
    includeWarmup: boolean;
    onIncludeWarmupChange: (checked: boolean) => void;
    children?: React.ReactNode;
}

export function SliderControls({
    currentIndex,
    slideCount,
    miniMode,
    onMiniModeChange,
    slidesToShow,
    onSlidesToShowChange,
    responsiveColumns,
    onPrev,
    onNext,
    includeWarmup,
    onIncludeWarmupChange,
    children,
}: SliderControlsProps) {
    return (
        <ControlCard>
            <div className="flex items-center gap-5 w-full lg:w-auto justify-between lg:justify-start">
                <Button onClick={onPrev} disabled={currentIndex === 0} size="icon" variant="default" className="rounded-full h-10 w-10">
                    <ChevronLeft className="h-6 w-6" />
                </Button>

                <div className="h-6 w-[1px] bg-border mx-1 hidden sm:block" />

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-tighter">
                        <Label htmlFor="mini-mode" className="cursor-pointer">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                        </Label>
                        <Switch id="mini-mode" checked={!miniMode} onCheckedChange={onMiniModeChange} className="scale-90" />
                    </div>

                    <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-tighter">
                        <Label htmlFor="warmup-mode" className="cursor-pointer">
                            <Dumbbell className="h-4 w-4 text-muted-foreground" />
                        </Label>
                        <Switch
                            id="warmup-mode"
                            checked={!includeWarmup}
                            onCheckedChange={(checked) => onIncludeWarmupChange(!checked)}
                            className="scale-90"
                        />
                    </div>

                    {/* Extra controls (e.g. Year Selector) */}
                    {children}

                    {/* Slides Per Page Control */}
                    {responsiveColumns === slidesToShow && (
                        <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-tighter">
                            <Columns className="h-4 w-4 text-muted-foreground" />
                            <Select value={slidesToShow.toString()} onValueChange={(value) => onSlidesToShowChange(Number(value))}>
                                <SelectTrigger className="w-[60px] h-9 text-xs border-none bg-muted/60 font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[3, 4, 5, 6, 7, 8].map((num) => (
                                        <SelectItem key={num} value={num.toString()}>
                                            {num}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="h-6 w-[1px] bg-border mx-1 hidden sm:block" />

                <div className="text-base font-black tabular-nums min-w-[5ch] text-center">
                    {currentIndex + 1} <span className="text-muted-foreground font-light mx-1">/</span> {slideCount || 1}
                </div>

                <Button onClick={onNext} disabled={currentIndex >= slideCount - 1} size="icon" variant="default" className="rounded-full h-10 w-10">
                    <ChevronRight className="h-6 w-6" />
                </Button>
            </div>
        </ControlCard>
    );
}
