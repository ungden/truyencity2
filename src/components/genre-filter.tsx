"use client";

import React, { useState } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { GENRE_CONFIG, type Topic } from '@/lib/types/genre-config';

interface GenreFilterProps {
  selectedGenres: string[];
  onGenreChange: (genres: string[]) => void;
  selectedStatus: string[];
  onStatusChange: (status: string[]) => void;
}

const statuses = [
  { id: 'dang-ra', name: 'Đang ra' },
  { id: 'hoan-thanh', name: 'Hoàn thành' },
  { id: 'tam-dung', name: 'Tạm dừng' },
  { id: 'drop', name: 'Drop' }
];

export const GenreFilter: React.FC<GenreFilterProps> = ({
  selectedGenres,
  onGenreChange,
  selectedStatus,
  onStatusChange
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleTopicToggle = (topicId: string) => {
    const newGenres = selectedGenres.includes(topicId)
      ? selectedGenres.filter(id => id !== topicId)
      : [...selectedGenres, topicId];
    onGenreChange(newGenres);
  };

  const handleStatusToggle = (statusId: string) => {
    const newStatus = selectedStatus.includes(statusId)
      ? selectedStatus.filter(id => id !== statusId)
      : [...selectedStatus, statusId];
    onStatusChange(newStatus);
  };

  const clearAllFilters = () => {
    onGenreChange([]);
    onStatusChange([]);
  };

  const activeFiltersCount = selectedGenres.length + selectedStatus.length;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <Filter size={16} className="mr-2" />
            Lọc
            {activeFiltersCount > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        
        <SheetContent side="bottom" className="h-[80vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>Lọc truyện</SheetTitle>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto mt-6 space-y-6 pb-20">
            {/* Genres with Topics */}
            <div>
              <h3 className="font-semibold mb-4">Thể loại</h3>
              <Accordion type="multiple" className="w-full space-y-2">
                {Object.entries(GENRE_CONFIG).map(([genreId, genre]) => (
                  <AccordionItem key={genreId} value={genreId} className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/50">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{genre.icon}</span>
                        <span className="font-medium">{genre.name}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-4 p-4 border-t">
                        {genre.topics?.map((topic: Topic) => (
                          <div key={topic.id} className="flex items-start space-x-2">
                            <Checkbox
                              id={topic.id}
                              checked={selectedGenres.includes(topic.id)}
                              onCheckedChange={() => handleTopicToggle(topic.id)}
                            />
                            <label
                              htmlFor={topic.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                            >
                              {topic.name}
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{topic.description}</p>
                            </label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* Status */}
            <div>
              <h3 className="font-semibold mb-4">Trạng thái</h3>
              <div className="grid grid-cols-2 gap-3">
                {statuses.map((status) => (
                  <div key={status.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                    <Checkbox
                      id={status.id}
                      checked={selectedStatus.includes(status.id)}
                      onCheckedChange={() => handleStatusToggle(status.id)}
                    />
                    <label
                      htmlFor={status.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {status.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t bg-background absolute bottom-0 left-0 right-0 p-4">
            <Button variant="outline" onClick={clearAllFilters} className="flex-1">
              Xóa tất cả ({activeFiltersCount})
            </Button>
            <Button onClick={() => setIsOpen(false)} className="flex-1">
              Áp dụng
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};