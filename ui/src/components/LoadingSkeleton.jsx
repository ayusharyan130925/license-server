import React from 'react'
import { Box, Skeleton, Card, CardContent } from '@mui/material'

export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <Box>
      {Array.from({ length: rows }).map((_, idx) => (
        <Box key={idx} display="flex" gap={2} sx={{ mb: 2 }}>
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={colIdx} variant="rectangular" width="100%" height={40} />
          ))}
        </Box>
      ))}
    </Box>
  )
}

export function CardSkeleton({ count = 4 }) {
  return (
    <Box display="flex" gap={2} flexWrap="wrap">
      {Array.from({ length: count }).map((_, idx) => (
        <Card key={idx} sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <CardContent>
            <Skeleton variant="text" width="60%" height={20} />
            <Skeleton variant="text" width="40%" height={40} sx={{ mt: 2 }} />
            <Skeleton variant="text" width="80%" height={16} sx={{ mt: 1 }} />
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}

export function PageSkeleton() {
  return (
    <Box>
      <Skeleton variant="text" width="30%" height={40} sx={{ mb: 3 }} />
      <CardSkeleton count={4} />
      <Skeleton variant="rectangular" width="100%" height={400} sx={{ mt: 3 }} />
    </Box>
  )
}
