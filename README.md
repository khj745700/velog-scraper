# Velog Scraper

## velog scraper?

velog 트렌드에 새로운 글이 올라오면, 항상 이전과 다른, 새로운 글을 찾고 싶습니다. 하지만 글들은 늘 겹쳐져 있는 것들이 많습니다. 이런 점을 해결하고자 개발하게 되었습니다.


## dependencies
- chormium
- mysql
- node:23
- linux 기반의 운영체제


## 설정파일
프로젝트 루트 파일에 <code>.env</code> 파일을 아래의 양식에 맞추어 추가해주시기 바랍니다.
```
DB_HOST=데이터베이스의 호스트
DB_USER=데이터베이스 계정아이디
DB_PW=데이터베이스 계정 비밀번호
DB_SCHEMA=데이터베이스 스키마
DB_PORT=데이터베이스 포트
DISCORD_WEBHOOK_URL=디스코드 웹훅 URL
```

---
추가적인 문제나 건의사항이 있으시면 Issues로 남겨주시면 반영해 손볼 수 있도록 하겠습니다!
