### WRITE REPORT

- Read the soure code in /src/backend/module/Attendance and all relevant soure code with Attendance module

- Assist me write a report with Attendance Module with contents such as the modules's class diagram and explain how SOLID principles was applied in this module 

- The contents must folow the following sections:

  1. Archiecture                         // Draw class diagram for Attendance module
  2. Single Responsibility Principle
  3. Open/Closed Principle
  4. Liskov Substitution Principle
  5. Interface Segregation Principle
  6. Dependency Inversion Principle
  7. Limitations                        // This section can be eliminated if there are not    any                                         limitations

- All diagram must be drawn in PlantUML (give me the UML code)

An example with report module:
\subsection{Report Module}

The Report module (\texttt{src/backend/modules/report}) produces attendance reports.
An administrator can view attendance records filtered by a single \textbf{date}, by
\textbf{status} (present, late, absent, incomplete) or by a \textbf{date range}, and can
\textbf{export} the result as a CSV file. An employee can view only their own attendance.

\begin{table}[H]
\centering
\caption{Report module endpoints}
\label{tab:report-endpoints}
\begin{tabular}{|l|l|p{5cm}|}
\hline
\textbf{Endpoint} & \textbf{Access} & \textbf{Description} \\
\hline
\texttt{GET /api/reports/attendance/me} & Employee & Own daily attendance \\
\hline
\texttt{GET /api/reports/attendance} & Admin & Attendance of all employees \\
\hline
\texttt{GET /api/reports/attendance/export} & Admin & Download the report as CSV \\
\hline
\end{tabular}
\end{table}

Query parameters are either \texttt{date} (one day) or \texttt{startDate} and
\texttt{endDate} (an inclusive range of at most 366 days), plus an optional
\texttt{status}. When no date is given, the report covers today.

\begin{figure}[H]
\centering
\includegraphics[width=0.95\linewidth]{parts/Huy/pictures/attendance-statistics.png}
\caption{Attendance statistics page for administrators}
\label{fig:report-statistics-page}
\end{figure}

\begin{figure}[H]
\centering
\includegraphics[width=0.95\linewidth]{parts/Huy/pictures/export-csv.png}
\caption{Exported attendance report in CSV format}
\label{fig:report-csv}
\end{figure}

\subsubsection{Architecture}

The module is split into layers, each in its own folder:

\begin{itemize}
  \item \texttt{routes/}: route declarations and access control.
  \item \texttt{controller/}: HTTP handling and query validation with Zod.
  \item \texttt{service/}: report business logic and CSV formatting.
  \item \texttt{repository/}: the data-access interface and its PostgreSQL implementation.
  \item \texttt{domain/}: data types and pure business rules with no I/O.
  \item \texttt{testing/}: an in-memory repository used by unit tests.
\end{itemize}

Figure~\ref{fig:report-class-diagram} shows the classes and their relationships.
A \texttt{+} marks a public member and a \texttt{-} a private one.
Boxes marked \texttt{<<module>>} are files that export functions rather than classes.
\texttt{TodayFn} stands for the function type \texttt{() => string}, and
\texttt{FilterAndRecords} for the object \texttt{\{ filter, records \}} returned by \texttt{load()}.

\begin{figure}[H]
\centering
\includegraphics[width=\linewidth]{parts/Huy/diagrams/class-diagram.png}
\caption{Class diagram of the Report module}
\label{fig:report-class-diagram}
\end{figure}

A request such as \texttt{GET /api/reports/attendance?status=late} is handled as follows:

\begin{enumerate}
  \item \texttt{createReportRouter} runs \texttt{requireAuth} and \texttt{requireRole('admin')},
        then calls the controller.
  \item \texttt{AttendanceReportController} validates the query with
        \texttt{parseAttendanceReportQuery}, which returns an \texttt{AttendanceReportFilter}.
  \item \texttt{AttendanceReportService.getRows} loads employees and daily activity from the
        repository in parallel, builds one \texttt{AttendanceReportRow} per employee per day,
        adds \emph{absent} rows for working days with no activity, filters by status and sorts.
  \item The controller returns JSON, or CSV through \texttt{formatAttendanceCsv}.
\end{enumerate}

Figure~\ref{fig:report-domain-model} shows the domain types. \texttt{ReportEmployee} and
\texttt{DailyActivity} are raw data from the repository; the service combines them into
\texttt{AttendanceReportRow}, whose \texttt{status} is computed by
\texttt{classifyAttendance} and whose \texttt{workingHours} is computed by \texttt{workingHours}.

\begin{figure}[H]
\centering
\includegraphics[width=0.85\linewidth]{parts/Huy/diagrams/domain-model.png}
\caption{Domain model of the Report module}
\label{fig:report-domain-model}
\end{figure}

\subsubsection{Single Responsibility Principle}

Each class or file has exactly one reason to change, as listed in
Table~\ref{tab:report-srp}.

\begin{table}[H]
\centering
\caption{Responsibility of each component}
\label{tab:report-srp}
\begin{tabular}{|p{6.4cm}|p{7cm}|}
\hline
\textbf{Component} & \textbf{Single responsibility} \\
\hline
\texttt{createReportRouter} & Declares routes and access control \\
\hline
\texttt{parseAttendanceReportQuery} & Validates and normalises the query (date, range, status) \\
\hline
\texttt{AttendanceReportController} & HTTP only: reads the request, writes JSON or CSV and headers \\
\hline
\texttt{AttendanceReportService} & Business logic: joins data, adds absent rows, filters, sorts \\
\hline
\texttt{formatAttendanceCsv} & CSV formatting, formula-injection protection, BOM for Excel \\
\hline
\texttt{PostgresAttendanceReportRepository} & Holds all SQL queries \\
\hline
\texttt{classifyAttendance}, \texttt{workingHours} & Pure rules: attendance status and working hours \\
\hline
\texttt{report-dates.ts} & Date and time-zone utilities \\
\hline
\end{tabular}
\end{table}

For example, the status rule is a pure function that knows nothing about HTTP or the
database:

\begin{verbatim}
export function classifyAttendance(
  checkIn: string | null,
  checkOut: string | null,
  lateAfter: string,
): AttendanceStatus {
  if (checkIn === null && checkOut === null) {
    return 'absent'
  }
  if (checkIn === null || checkOut === null || checkOut < checkIn) {
    return 'incomplete'
  }
  return checkIn > lateAfter ? 'late' : 'present'
}
\end{verbatim}

As a result, changing the late threshold only changes the \texttt{lateAfter} setting,
changing the CSV columns only touches \texttt{attendance-csv.ts}, and changing the database
schema only touches the PostgreSQL repository.

\subsubsection{Open/Closed Principle}

The module is open for extension but closed for modification:

\begin{itemize}
  \item \texttt{AttendanceReportService} works through the
        \texttt{AttendanceReportRepository} interface. Adding a new data source, such as
        \texttt{InMemoryAttendanceReportRepository} for tests, required no change to the service.
  \item Business settings (\texttt{lateAfter}, \texttt{timeZone}, \texttt{today}) are passed in
        from outside, so a new office start time or time zone needs no code change in the module.
  \item The export format is a separate function that takes \texttt{AttendanceReportRow[]}.
        A new format, such as Excel, would be a new formatter while the service stays unchanged.
\end{itemize}

\subsubsection{Liskov Substitution Principle}

The repository interface states a contract that every implementation must honour:

\begin{verbatim}
export interface AttendanceReportRepository {
  // Every employee, inactive ones included, unique ids.
  listEmployees(): Promise<ReportEmployee[]>
  // Both range ends are inclusive. One entry per employee per local
  // day, holding the earliest check-in and the latest check-out.
  listDailyActivity(range: DateRange): Promise<DailyActivity[]>
}
\end{verbatim}

\begin{itemize}
  \item \texttt{PostgresAttendanceReportRepository} honours it in SQL: it groups by employee
        and day, taking \texttt{MIN} of check-ins and \texttt{MAX} of check-outs.
  \item \texttt{InMemoryAttendanceReportRepository} honours it by filtering an in-memory array
        with an inclusive date range.
  \item Because both keep the same contract, the unit tests substitute the in-memory version
        for PostgreSQL and the service behaves exactly as in production:
\end{itemize}

\begin{verbatim}
const serviceWith = (employees, activity = []) =>
  new AttendanceReportService(
    new InMemoryAttendanceReportRepository(employees, activity),
    '09:00:00',
    () => TODAY,
  )
\end{verbatim}

\subsubsection{Interface Segregation Principle}

No client depends on methods it does not use:

\begin{itemize}
  \item \texttt{AttendanceReportRepository} has exactly the two methods the service needs,
        \texttt{listEmployees()} and \texttt{listDailyActivity(range)}. It has no create, update
        or delete methods, because the Report module only reads data.
  \item The module does not reuse the repositories of the Attendance or User modules, which
        contain many write methods. It has its own small, read-only interface shaped by the
        needs of the report.
  \item Data types are kept small as well: the repository only needs \texttt{DateRange}, while
        the controller and service use \texttt{AttendanceReportFilter}, which extends
        \texttt{DateRange} with an optional \texttt{status}.
\end{itemize}

\subsubsection{Dependency Inversion Principle}

High-level code depends on abstractions, not on concrete implementations:

\begin{itemize}
  \item \texttt{AttendanceReportService} only knows the \texttt{AttendanceReportRepository}
        interface. It never imports \texttt{pg} or \texttt{PostgresAttendanceReportRepository}.
  \item Every dependency is passed through a constructor in \texttt{app.ts}, the composition
        root of the application.
  \item Even the system clock is injected as a \texttt{today} function instead of calling
        \texttt{new Date()} inside the service, so tests can fix the current date.
\end{itemize}

\begin{verbatim}
const today = () => todayIn(env.reportTimeZone)
const reportRepository =
  new PostgresAttendanceReportRepository(pool, env.reportTimeZone)
const reportService =
  new AttendanceReportService(reportRepository, env.reportLateAfter, today)
const reportController =
  new AttendanceReportController(reportService, today)
\end{verbatim}

Figure~\ref{fig:report-di} shows how \texttt{app.ts} wires the production objects and how
the unit test replaces the PostgreSQL repository with the in-memory one.

\begin{figure}[H]
\centering
\includegraphics[width=0.9\linewidth]{parts/Huy/diagrams/dependency-injection.png}
\caption{Dependency injection in the Report module}
\label{fig:report-di}
\end{figure}

\subsubsection{Limitations}

\begin{itemize}
  \item \texttt{AttendanceReportController} receives the concrete
        \texttt{AttendanceReportService} class rather than an interface, and calls
        \texttt{formatAttendanceCsv} directly. TypeScript's structural typing still lets tests
        pass any object with a \texttt{getRows()} method, but this is not full dependency
        inversion.
  \item \texttt{createReportRouter} receives the concrete \texttt{AuthService} from the User
        module.
  \item These points are kept simple on purpose: each has only one implementation today, so an
        extra interface would be an unnecessary abstraction. An interface can be extracted once
        a second export format or authentication method appears.
\end{itemize}


- Write report then return me a latex code then write it in solid_latex.txt
- Just view and write report do not change anything in current soure code. 
- Write all report content in English.




