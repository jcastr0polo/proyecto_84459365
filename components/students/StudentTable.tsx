'use client';

import React from 'react';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Table, { Thead, Th, Tbody, Tr, Td } from '@/components/ui/Table';
import StudentCard from '@/components/students/StudentCard';
import type { EnrollmentWithStudent } from '@/lib/types';

interface StudentTableProps {
  enrollments: EnrollmentWithStudent[];
  onWithdraw?: (enrollId: string) => void;
  courseId?: string;
}

/**
 * StudentTable — Tabla responsiva de estudiantes inscritos
 * Desktop: tabla con columnas  |  Mobile: cards apiladas
 */
export default function StudentTable({ enrollments, onWithdraw, courseId }: StudentTableProps) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <Thead>
            <tr>
              <Th>Estudiante</Th>
              <Th>Email</Th>
              <Th>Documento</Th>
              <Th>Estado</Th>
              <Th>Inscripción</Th>
              <Th className="text-right">Acciones</Th>
            </tr>
          </Thead>
          <Tbody>
            {enrollments.map((enrollment) => {
              const { student } = enrollment;
              const isActive = enrollment.status === 'active';
              return (
                <Tr key={enrollment.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/15 flex items-center justify-center text-[10px] font-bold text-cyan-400 shrink-0">
                        {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                      </div>
                      <span className="font-medium text-foreground/90">
                        {student.firstName} {student.lastName}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-muted">{student.email}</span>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs text-muted">{student.documentNumber}</span>
                  </Td>
                  <Td>
                    <Badge variant={isActive ? 'success' : 'danger'} size="sm" dot>
                      {isActive ? 'Activo' : 'Retirado'}
                    </Badge>
                  </Td>
                  <Td>
                    <span className="text-xs text-muted">{formatDate(enrollment.enrolledAt)}</span>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/students/${student.id}${courseId ? `?from=${courseId}` : ''}`}
                        className="p-1.5 rounded text-faint hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                        title="Ver detalle del estudiante"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {isActive && onWithdraw && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onWithdraw(enrollment.id)}
                        >
                          Retirar
                        </Button>
                      )}
                      {!isActive && enrollment.withdrawnAt && (
                        <span className="text-[10px] text-subtle">
                          {formatDate(enrollment.withdrawnAt)}
                        </span>
                      )}
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {enrollments.map((enrollment) => (
          <StudentCard
            key={enrollment.id}
            enrollment={enrollment}
            onWithdraw={onWithdraw}
            courseId={courseId}
          />
        ))}
      </div>
    </>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return iso;
  }
}
