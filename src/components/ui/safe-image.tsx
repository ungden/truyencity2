"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface SafeImageProps extends Omit<React.ComponentProps<typeof Image>, 'src'> {
  src?: string | null;
  fallbackSrc?: string;
}

const SafeImage: React.FC<SafeImageProps> = ({ src, alt, fallbackSrc = '/placeholder.svg', className, ...props }) => {
  const [error, setError] = useState(!src);

  const handleError = () => {
    setError(true);
  };

  return (
    <div className={cn("relative", className)}>
      <Image
        src={error ? fallbackSrc : src!}
        alt={alt}
        onError={handleError}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
        {...props}
      />
    </div>
  );
};

export default SafeImage;