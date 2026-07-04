export type TimetableFiltersState = {
  dayOfWeek: string;
  groupId: string;
  teacherUserId: string;
};

export const emptyTimetableFilters: TimetableFiltersState = {
  dayOfWeek: "",
  groupId: "",
  teacherUserId: "",
};
