'use client';

import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  Target, 
  Clock,
  Settings,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  PenTool,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AIStoryProject } from '@/lib/types/ai-writer';
import { cn } from '@/lib/utils';
import { GENRE_CONFIG, type GenreKey } from '@/lib/types/genre-config';

interface ProjectCardProps {
  project: AIStoryProject;
  onSelect: () => void;
  onEdit: () => void;
  onStatusChange: () => void;
  onWriteNext: () => void;
  isWriting: boolean;
  isSelected: boolean;
}

export function ProjectCard({ project, onSelect, onEdit, onStatusChange, onWriteNext, isWriting, isSelected }: ProjectCardProps) {
  const progress = (project.current_chapter / project.total_planned_chapters) * 100;
  const genreConfig = GENRE_CONFIG[project.genre as GenreKey] || GENRE_CONFIG['tien-hiep'];
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Đang viết';
      case 'paused': return 'Tạm dừng';
      case 'completed': return 'Hoàn thành';
      default: return 'Không xác định';
    }
  };

  const handleWriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onWriteNext();
  };

  return (
    <Card className={cn(
      "cursor-pointer transition-all duration-200 hover:shadow-md border-0 shadow-sm flex flex-col",
      isSelected ? "ring-2 ring-primary bg-primary/5" : ""
    )} onClick={onSelect}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1 truncate">
              {project.novel?.title || 'Truyện chưa có tên'}
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              {project.novel?.author || 'Tác giả chưa rõ'}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={getStatusColor(project.status)}>
                {getStatusLabel(project.status)}
              </Badge>
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <span className="text-lg">{genreConfig.icon}</span>
                {genreConfig.name}
              </Badge>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuLabel>Hành động</DropdownMenuLabel>
              <DropdownMenuItem onClick={onEdit}>
                <Settings size={16} className="mr-2" />
                Cài đặt (Sửa)
              </DropdownMenuItem>
              {project.status !== 'completed' && (
                <DropdownMenuItem onClick={onStatusChange}>
                  {project.status === 'active' ? (
                    <PauseCircle size={16} className="mr-2" />
                  ) : (
                    <PlayCircle size={16} className="mr-2" />
                  )}
                  {project.status === 'active' ? 'Tạm dừng' : 'Tiếp tục'}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 flex-1">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Tiến độ</span>
              <span className="font-medium">
                {project.current_chapter}/{project.total_planned_chapters} chương
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1"><User size={12} /><span className="text-xs">Nhân vật</span></div>
              <p className="text-sm font-medium truncate" title={project.main_character}>{project.main_character}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1"><Target size={12} /><span className="text-xs">Độ dài</span></div>
              <p className="text-sm font-medium">{project.target_chapter_length}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1"><Clock size={12} /><span className="text-xs">Cập nhật</span></div>
              <p className="text-sm font-medium">{new Date(project.updated_at).toLocaleDateString('vi-VN')}</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <Button
          className="w-full font-semibold"
          onClick={handleWriteClick}
          disabled={isWriting || project.status !== 'active'}
        >
          {isWriting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <PenTool className="mr-2 h-4 w-4" />
          )}
          {isWriting ? 'Đang viết...' : 'Viết chương tiếp'}
        </Button>
      </CardFooter>
    </Card>
  );
}