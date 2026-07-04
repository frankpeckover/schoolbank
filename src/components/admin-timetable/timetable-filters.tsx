import { SelectField } from "@/components/admin-timetable/timetable-fields";
import { weekDays } from "@/components/admin-timetable/timetable-constants";
import type { TimetableFiltersState } from "@/components/admin-timetable/timetable-types";
import type { GroupListItem } from "@/services/group-service";
import type { TimetableTeacher } from "@/services/timetable-service";

export function TimetableFilters({
  filters,
  groups,
  onFiltersChange,
  teachers,
}: {
  filters: TimetableFiltersState;
  groups: GroupListItem[];
  onFiltersChange: (filters: TimetableFiltersState) => void;
  teachers: TimetableTeacher[];
}) {
  function updateFilter<Field extends keyof TimetableFiltersState>(
    field: Field,
    value: TimetableFiltersState[Field],
  ) {
    onFiltersChange({ ...filters, [field]: value });
  }

  return (
    <div className="theme-subpanel mt-4 p-4">
      <div className="grid gap-4 md:grid-cols-3">
        <SelectField
          label="Teacher"
          onChange={(value) => updateFilter("teacherUserId", value)}
          value={filters.teacherUserId}
        >
          <option value="">All teachers</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.displayName}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Group"
          onChange={(value) => updateFilter("groupId", value)}
          value={filters.groupId}
        >
          <option value="">All groups</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Day"
          onChange={(value) => updateFilter("dayOfWeek", value)}
          value={filters.dayOfWeek}
        >
          <option value="">All days</option>
          {weekDays.map((day, index) => (
            <option key={day} value={String(index)}>
              {day}
            </option>
          ))}
        </SelectField>
      </div>
    </div>
  );
}
