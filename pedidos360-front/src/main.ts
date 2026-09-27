import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { Amplify } from 'aws-amplify';
import { API_CONFIG } from './app/api.config';

Amplify.configure({
  Auth:{
    Cognito:{
      userPoolId: 'us-east-1_cRb1mCRID',
      userPoolClientId : '72tfeld99bp84ph6k5qth991d8',
      loginWith:{
        oauth:{
          domain: 'us-east-1crb1mcrid.auth.us-east-1.amazoncognito.com',
          scopes:[
            'email',
            'openid',
            'profile',
            ...Object.values(API_CONFIG.scopes)
          ],
          redirectSignIn:[
            'http://localhost:4200'
          ],
          redirectSignOut:[
            'http://localhost:4200'
          ],
          responseType:'code'
        }
      }
    }
  }
});

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
