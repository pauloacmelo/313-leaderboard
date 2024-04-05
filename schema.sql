CREATE TABLE competitions (
  competition_id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_name TEXT,
  competition_handle TEXT
);
CREATE UNIQUE INDEX ux_competition_handle ON competitions(competition_handle);
CREATE TABLE wods (
  wod_id INTEGER PRIMARY KEY AUTOINCREMENT,
  wod_name TEXT,
  wod_description TEXT,
  wod_config JSONB,
  competition_id INTEGER,
  FOREIGN KEY (competition_id) REFERENCES competitions(competition_id)
);
ALTER TABLE wods ADD COLUMN wod_config JSONB;
CREATE TABLE divisions (
  division_id INTEGER PRIMARY KEY AUTOINCREMENT,
  division_name TEXT,
  competition_id INTEGER,
  FOREIGN KEY (competition_id) REFERENCES competitions(competition_id)
);
CREATE TABLE submissions (
  submission_id INTEGER PRIMARY KEY AUTOINCREMENT,
  wod_id INTEGER,
  athlete TEXT,
  score_number REAL,
  score_label TEXT,
  wod_date TEXT,
  division_id INTEGER,
  FOREIGN KEY (division_id) REFERENCES divisions(division_id),
  FOREIGN KEY (wod_id) REFERENCES wods(wod_id)
);
CREATE TABLE users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT
);
insert into users (user_id, user_email) values (1, 'pauloacmelo@gmail.com');
ALTER TABLE submissions ADD COLUMN division_id INTEGER;
ALTER TABLE submissions DROP COLUMN score_number;
ALTER TABLE submissions ADD COLUMN scores JSONB;
update submissions set scores = '["'
  || case when score_number > 0 then cast((15*60 - cast(score_number as integer))/60 as text) || ':' || substr('00' || cast((15*60 - cast(score_number as integer))%60 as text), -2, 2)  else '15:00' end
  || '", ' || (case when score_number >= 0 then 180 else cast(score_number + 180 as integer) end)
  || ']'
where wod_id = 5;

select score_number, score_label, '['
  || case when score_number > 0 then cast((15*60 - cast(score_number as integer))/60 as text) || ':' || substr('00' || cast((15*60 - cast(score_number as integer))%60 as text), -2, 2)  else '15:00' end
  || ', ' || (case when score_number >= 0 then 180 else cast(score_number + 180 as integer) end)
  || ']'
from submissions where wod_id = 5;
update submissions set scores = substr(cast(scores as text), 1, length(cast(scores as text)) - 1) || ', "' || '12:34' || '"]' where athlete = '' and submission_id > 281;
select *, substr(cast(scores as text), 1, length(cast(scores as text)) - 1) || ', "' || '12:34' || '"]' from submissions;

INSERT INTO competitions(competition_name, competition_handle) VALUES
('Open 2023', 'open2023'),
('Open 2024', 'open2024');
INSERT INTO divisions(division_name, competition_id) VALUES
('RX - Men', 2),
('RX - Women', 2),
('Scale - Men', 2),
('Scale - Women', 2);
INSERT INTO wods(wod_name, competition_id) VALUES
('23.1', 1),
('23.2A', 1),
('23.2B', 1),
('23.3', 1);
INSERT INTO submissions(athlete, wod_id, score_number, score_label) VALUES
('JEFFREY ADLER',1,298,'(298 reps)'),
('JEFFREY ADLER',2,181,'(181 reps)'),
('JEFFREY ADLER',3,312,'(312 lbs)'),
('JEFFREY ADLER',4,8.01,'(8:01)'),
('TOLA MORAKINYO',1,277,'(277 reps)'),
('TOLA MORAKINYO',2,175,'(175 reps)'),
('TOLA MORAKINYO',3,327,'(327 lbs)'),
('TOLA MORAKINYO',4,7.44,'(7:44)'),
('COLTEN MERTENS',1,274,'(274 reps)'),
('COLTEN MERTENS',2,180,'(180 reps)'),
('COLTEN MERTENS',3,302,'(302 lbs)'),
('COLTEN MERTENS',4,9.29,'(9:29)'),
('TYLER CHRISTOPHEL',1,278,'(278 reps)'),
('TYLER CHRISTOPHEL',2,172,'(172 reps)'),
('TYLER CHRISTOPHEL',3,317,'(317 lbs)'),
('TYLER CHRISTOPHEL',4,8.55,'(8:55)'),
('ROLDAN GOLDBAUM',1,273,'(273 reps)'),
('ROLDAN GOLDBAUM',2,170,'(170 reps)'),
('ROLDAN GOLDBAUM',3,317,'(317 lbs)'),
('ROLDAN GOLDBAUM',4,9.10,'(9:10)'),
('SAMUEL COURNOYER',1,292,'(292 reps)'),
('SAMUEL COURNOYER',2,172,'(172 reps)'),
('SAMUEL COURNOYER',3,295,'(295 lbs)'),
('SAMUEL COURNOYER',4,7.53,'(7:53)'),
('RICKY GARARD',1,298,'(298 reps)'),
('RICKY GARARD',2,187,'(187 reps)'),
('RICKY GARARD',3,287,'(287 lbs)'),
('RICKY GARARD',4,8.39,'(8:39)'),
('DALLIN PEPPER',1,293,'(293 reps)'),
('DALLIN PEPPER',2,182,'(182 reps)'),
('DALLIN PEPPER',3,287,'(287 lbs)'),
('DALLIN PEPPER',4,8.22,'(8:22)'),
('REGGIE FASA',1,272,'(272 reps)'),
('REGGIE FASA',2,173,'(173 reps)'),
('REGGIE FASA',3,311,'(311 lbs)'),
('REGGIE FASA',4,11.00,'(11:00)'),
('CAM CROCKETT',1,273,'(273 reps)'),
('CAM CROCKETT',2,175,'(175 reps)'),
('CAM CROCKETT',3,297,'(297 lbs)'),
('CAM CROCKETT',4,10.19,'(10:19)'),
('AUSTIN HATFIELD',1,271,'(271 reps)'),
('AUSTIN HATFIELD',2,168,'(168 reps)'),
('AUSTIN HATFIELD',3,307,'(307 lbs)'),
('AUSTIN HATFIELD',4,8.42,'(8:42)'),
('NICK MATHEW',1,267,'(267 reps)'),
('NICK MATHEW',2,177,'(177 reps)'),
('NICK MATHEW',3,292,'(292 lbs)'),
('NICK MATHEW',4,9.35,'(9:35)'),
('JAY CROUCH',1,281,'(281 reps)'),
('JAY CROUCH',2,176,'(176 reps)'),
('JAY CROUCH',3,287,'(287 lbs)'),
('JAY CROUCH',4,8.35,'(8:35)'),
('TIMOTHY PAULSON',1,261,'(261 reps)'),
('TIMOTHY PAULSON',2,173,'(173 reps)'),
('TIMOTHY PAULSON',3,297,'(297 lbs)'),
('TIMOTHY PAULSON',4,8.13,'(8:13)'),
('ANIOL EKAI',1,289,'(289 reps)'),
('ANIOL EKAI',2,172,'(172 reps)'),
('ANIOL EKAI',3,291,'(291 lbs)'),
('ANIOL EKAI',4,10.23,'(10:23)'),
('ALEX KOTOULAS',1,285,'(285 reps)'),
('ALEX KOTOULAS',2,174,'(174 reps)'),
('ALEX KOTOULAS',3,287,'(287 lbs)'),
('ALEX KOTOULAS',4,9.55,'(9:55)'),
('ROMAN KHRENNIKOV',1,306,'(306 reps)'),
('ROMAN KHRENNIKOV',2,168,'(168 reps)'),
('ROMAN KHRENNIKOV',3,295,'(295 lbs)'),
('ROMAN KHRENNIKOV',4,9.58,'(9:58)'),
('ALEXANDER MAJORS',1,273,'(273 reps)'),
('ALEXANDER MAJORS',2,172,'(172 reps)'),
('ALEXANDER MAJORS',3,292,'(292 lbs)'),
('ALEXANDER MAJORS',4,10.22,'(10:22)'),
('TRAVON BENTON',1,268,'(268 reps)'),
('TRAVON BENTON',2,169,'(169 reps)'),
('TRAVON BENTON',3,297,'(297 lbs)'),
('TRAVON BENTON',4,9.58,'(9:58)'),
('WILLIAM LEAHY IV',1,295,'(295 reps)'),
('WILLIAM LEAHY IV',2,166,'(166 reps)'),
('WILLIAM LEAHY IV',3,297,'(297 lbs)'),
('WILLIAM LEAHY IV',4,9.12,'(9:12)');



INSERT INTO competitions(competition_name) VALUES
('Open 2024');
INSERT INTO wods(wod_name, competition_id) VALUES
('24.1', 2),
('24.2', 2),
('24.3', 2);
INSERT INTO submissions(athlete, wod_id, score_number, score_label) VALUES
('DAVI', 5, 15*60-10*60-59, '(10:59)'),
('PAULO', 5, 15*60-12*60-13, '(12:13)'),
('JEFF', 5, 15*60-13*60-43, '(13:43)'),
('ATILA', 5, 15*60-13*60-47, '(13:47)'),
('PAULO', 6, 583, '(583 reps)'),
('JEFF', 6, 570, '(570 reps)'),
('DAVI', 6, 557, '(557 reps)'),
('CARLO', 6, 488, '(488 reps)');

INSERT INTO submissions(athlete, wod_id, score_number, score_label) VALUES
('ATILA', 6, 668, '(668 reps)');





select submissions.*,
  (
    select count(*)+1
    from submissions s2
    where s2.athlete = submissions.athlete
      and s2.wod_id = submissions.wod_id
      and s2.division_id = submissions.division_id
      and (
        s2.scores->0 < submissions.scores->0 or
        (s2.scores->0 = submissions.scores->0 and s2.scores->1 > submissions.scores->1) or
        (s2.scores->0 = submissions.scores->0 and s2.scores->1 = submissions.scores->1 and s2.scores->2 < submissions.scores->2)
      )
  ) submission_rank
from submissions
left join wods on wods.wod_id = submissions.wod_id
left join competitions on wods.competition_id = competitions.competition_id
where competition_handle = 'open2024';